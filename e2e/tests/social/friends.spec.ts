import { test, expect } from '@/fixtures'
import type { Browser, Page } from '@playwright/test'
import { CommunityPage, escapeRegExp } from '@/pages/CommunityPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { NavbarPage } from '@/pages/NavbarPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SearchPage } from '@/pages/SearchPage'
import { FRIEND_STATE } from '@/support/auth-state'
import { SEED_TITLES, THROWAWAY_TITLES, type CatalogTitle } from '@/support/test-data'

/**
 * Friend requests, a friend's profile and «У друзей» — two accounts: user (`page`) and friend
 * (`friendPage`, TEST_USER2_*).
 *
 * Serial: each test continues the relation the previous one left. beforeAll / afterAll bring the
 * pair to «no link at all» through the user's /community, so the set starts clean after any
 * interrupted run and leaves nothing behind.
 *
 * Data:
 * - friend's library is this spec's own: FRIEND_LIBRARY below, kept in shape by beforeAll;
 * - user's seed titles are only read here (other areas run against the same account);
 * - «Самсара» (THROWAWAY_TITLES.social) is the one title of user this spec adds and deletes.
 */

const INCEPTION_TITLE = 'Начало'
const INCEPTION = SEED_TITLES.find((t) => t.tmdbId === 27205)!
const SAMSARA = THROWAWAY_TITLES.social

/** Friend's rating of both titles: ≥ 8 makes them friend's «любимое» (lib/compare.ts). */
const FRIEND_RATING = 9
const FRIEND_STATUS = 'Просмотрено'

/**
 * Friend's library. «Начало» is shared with user's seed — «Смотрели оба» and «У друзей».
 * «Самсара» is missing from user's library — «Любимое @friend, которого нет у вас» with its «+».
 * Both «Просмотрено» (a «Хочу посмотреть» title is never «common») with rating 9.
 */
const FRIEND_LIBRARY: (CatalogTitle & { title: string })[] = [
  { ...INCEPTION, title: INCEPTION_TITLE },
  { query: SAMSARA.query, kind: SAMSARA.kind, tmdbId: SAMSARA.tmdbId, title: SAMSARA.title },
]

/**
 * Makes friend's library hold FRIEND_LIBRARY with the right status and rating. A title in another
 * state is deleted and added again through the search dialog — the only UI that sets both at once.
 * Idempotent: titles already in shape are left alone.
 */
async function ensureFriendLibrary(friend: Page) {
  const library = new LibraryPage(friend)
  const search = new SearchPage(friend)
  for (const { query, kind, tmdbId, title } of FRIEND_LIBRARY) {
    await library.goto(title)
    await expect(library.foundCount).toBeVisible()
    const cards = library.cardsByTitle(title)
    const inShape =
      (await cards.count()) === 1 &&
      (await cards.getByText(FRIEND_STATUS, { exact: true }).count()) === 1 &&
      (await cards.getByText(String(FRIEND_RATING), { exact: true }).count()) === 1
    if (inShape) continue

    await library.removeByTitle(title)
    await search.goto()
    await search.search(query)
    const card = search.resultCard(kind, tmdbId)
    await search.openAddDialog(card)
    await search.chooseDialogStatus(FRIEND_STATUS)
    await search.dialog.getByRole('button', { name: `Оценка ${FRIEND_RATING}`, exact: true }).click()
    await expect(search.dialog.getByText(`${FRIEND_RATING}/10`)).toBeVisible()
    await search.confirmAdd()
    await expect(search.addedButton(card)).toBeVisible({ timeout: 15_000 })
  }
}

let userName: string
let friendName: string

/**
 * Opens one page per account for beforeAll / afterAll. Inside hooks `browser.newContext()` still
 * gets the project's `use` (baseURL, bypass header, user's storageState); friend swaps the session.
 */
async function withBothUsers(
  browser: Browser,
  body: (user: Page, friend: Page) => Promise<void>,
) {
  const userContext = await browser.newContext()
  const friendContext = await browser.newContext({ storageState: FRIEND_STATE })
  try {
    await body(await userContext.newPage(), await friendContext.newPage())
  } finally {
    await userContext.close()
    await friendContext.close()
  }
}

test.describe('friends: requests, profile, «У друзей»', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 })

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000)
    await withBothUsers(browser, async (user, friend) => {
      await user.goto('/library')
      userName = await new NavbarPage(user).getOwnUsername()
      await friend.goto('/library')
      friendName = await new NavbarPage(friend).getOwnUsername()

      await new CommunityPage(user).disconnect(friendName)
      // A leftover of an interrupted TC-SOCIAL-006 would drop «Самсара» out of «Любимое»
      await new LibraryPage(user).removeByTitle(SAMSARA.title)
      await ensureFriendLibrary(friend)
    })
  })

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000)
    // beforeAll failed before learning the names — nothing was changed
    if (!friendName) return
    await withBothUsers(browser, async (user) => {
      await new CommunityPage(user).disconnect(friendName)
      await new LibraryPage(user).removeByTitle(SAMSARA.title)
    })
  })

  test('TC-SOCIAL-001: request declined by the friend — user can send it again', async ({
    communityPage,
    friendPage,
  }) => {
    await test.step('user sends a request', async () => {
      await communityPage.goto()
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'none')
      await communityPage.sendRequest(friendName)
      await communityPage.expectRelation(friendName, 'pending')
    })

    await test.step('friend sees the incoming request and declines it', async () => {
      const friendCommunity = new CommunityPage(friendPage)
      await friendCommunity.goto()
      await expect(friendCommunity.incomingRequest(userName)).toBeVisible()
      await friendCommunity.declineRequest(userName)
      await expect(friendCommunity.incomingRequest(userName)).toHaveCount(0)
      await friendPage.reload()
      await expect(friendCommunity.searchInput).toBeVisible()
      await expect(friendCommunity.incomingRequest(userName)).toHaveCount(0)
      await expect(friendCommunity.friendCard(userName)).toHaveCount(0)
    })

    await test.step('user sees «Добавить» again', async () => {
      await communityPage.goto()
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'none')
    })
  })

  test('TC-SOCIAL-002: user cancels the outgoing request', async ({ page, communityPage, friendPage }) => {
    await communityPage.goto()
    await communityPage.searchUser(friendName)
    await communityPage.sendRequest(friendName)
    await communityPage.expectRelation(friendName, 'pending')

    await test.step('the request survives a reload', async () => {
      await page.reload()
      await expect(communityPage.searchInput).toBeVisible()
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'pending')
    })

    await communityPage.cancelRequest(friendName)
    await communityPage.expectRelation(friendName, 'none')

    await test.step('the cancel is saved: user sees «Добавить», friend has no request', async () => {
      await communityPage.goto()
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'none')

      const friendCommunity = new CommunityPage(friendPage)
      await friendCommunity.goto()
      await expect(friendCommunity.incomingRequest(userName)).toHaveCount(0)
    })
  })

  test('TC-SOCIAL-003: request accepted — both see each other in «Мои друзья»', async ({
    communityPage,
    friendPage,
  }) => {
    await communityPage.goto()
    await communityPage.searchUser(friendName)
    await communityPage.sendRequest(friendName)
    await communityPage.expectRelation(friendName, 'pending')

    const friendCommunity = new CommunityPage(friendPage)
    await test.step('friend accepts', async () => {
      await friendCommunity.goto()
      await friendCommunity.acceptRequest(userName)
      await expect(friendCommunity.incomingRequest(userName)).toHaveCount(0)
      await expect(friendCommunity.friendCard(userName)).toBeVisible()
    })

    await test.step('friend: saved after a reload', async () => {
      await friendCommunity.goto()
      await expect(friendCommunity.incomingRequest(userName)).toHaveCount(0)
      await expect(friendCommunity.friendCard(userName)).toBeVisible()
    })

    await test.step('user: friend in «Мои друзья», search says «В друзьях»', async () => {
      await communityPage.goto()
      await expect(communityPage.friendCard(friendName)).toBeVisible()
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'friend')
    })
  })

  test('TC-SOCIAL-004: friend profile shows their library and «Что у нас общего»', async ({
    libraryPage,
    profilePage,
  }) => {
    // «Смотрели оба» skips titles that either side keeps in «Хочу посмотреть». User's status of
    // «Начало» belongs to other areas (the CI account seeds it as «Хочу посмотреть»), so it is
    // read here, not set
    await libraryPage.goto(INCEPTION_TITLE)
    const inception = libraryPage.card(INCEPTION_TITLE)
    await expect(inception).toBeVisible()
    const userPlansInception = (await inception.getByText('Хочу посмотреть', { exact: true }).count()) > 0

    await profilePage.goto(friendName)

    await test.step('friend library', async () => {
      await expect(profilePage.libraryCard(INCEPTION_TITLE)).toBeVisible()
      await expect(profilePage.libraryCard(SAMSARA.title)).toBeVisible()
      await expect(profilePage.libraryCard(SAMSARA.title)).toHaveAttribute(
        'href',
        new RegExp(`^/profile/${escapeRegExp(friendName)}/media/[0-9a-f-]{36}$`),
      )
      // Card «+»: «Самсара» is not in user's library
      await expect(profilePage.addButton(profilePage.librarySection, SAMSARA.title)).toBeEnabled()
    })

    await test.step('«Что у нас общего»', async () => {
      await expect(profilePage.commonTitles).toBeVisible()
      await expect(profilePage.commonWatched).toBeVisible()
      await expect(profilePage.commonCard(profilePage.commonWatched, INCEPTION_TITLE)).toHaveCount(
        userPlansInception ? 0 : 1,
      )
      await expect(profilePage.commonCard(profilePage.commonWatched, SAMSARA.title)).toHaveCount(0)

      // Friend rated both 9 (≥ 8 — «любимое»); user already has «Начало»
      await expect(profilePage.commonFavorites).toContainText(`Любимое @${friendName}, которого нет у вас`)
      await expect(profilePage.commonCard(profilePage.commonFavorites, SAMSARA.title)).toBeVisible()
      await expect(profilePage.commonCard(profilePage.commonFavorites, INCEPTION_TITLE)).toHaveCount(0)
      await expect(profilePage.addButton(profilePage.commonFavorites, SAMSARA.title)).toBeEnabled()
    })
  })

  test('TC-SOCIAL-005: «У друзей» on a shared title leads to the friend\'s read-only page', async ({
    page,
    libraryPage,
    profilePage,
  }) => {
    const myInceptionUrl = await libraryPage.mediaUrlOf(INCEPTION_TITLE)
    await page.goto(myInceptionUrl)
    await expect(page.getByRole('heading', { level: 1, name: INCEPTION_TITLE })).toBeVisible()

    const friends = page.getByRole('region', { name: 'У друзей' })
    // The section streams in its own <Suspense> — allow for the service-client queries
    await expect(friends).toBeVisible({ timeout: 20_000 })
    const entry = friends.getByRole('link', { name: new RegExp(`^@${escapeRegExp(friendName)} `) })
    await expect(entry).toBeVisible()
    await expect(entry).toContainText(FRIEND_STATUS)
    await expect(entry).toContainText(String(FRIEND_RATING))
    await expect(entry).toHaveAttribute('href', new RegExp(`^/profile/${escapeRegExp(friendName)}/media/[0-9a-f-]{36}$`))

    await entry.click()
    await page.waitForURL(new RegExp(`/profile/${escapeRegExp(friendName)}/media/[0-9a-f-]{36}$`))

    await test.step('read-only page of the friend\'s row', async () => {
      await expect(page.getByRole('heading', { level: 1, name: INCEPTION_TITLE })).toBeVisible()
      await expect(profilePage.ownerCaption(friendName)).toBeVisible()
      await expect(profilePage.statusBadge(FRIEND_STATUS)).toBeVisible()
      await expect(profilePage.ratingBadge(`${FRIEND_RATING}/10`)).toBeVisible()
      // Nothing to edit: no status select of the own title page
      await expect(page.getByTestId('status-select')).toHaveCount(0)
      // The title is in user's library too — a link to user's own card instead of «Добавить»
      await expect(profilePage.myCardLink).toHaveAttribute('href', myInceptionUrl)
    })

    await profilePage.backToProfileLink.click()
    await expect(profilePage.heading(friendName)).toBeVisible()
  })

  test('TC-SOCIAL-006: adding the friend\'s favourite from their profile', async ({
    libraryPage,
    profilePage,
  }) => {
    // Leftover of an interrupted run (beforeAll removes it too)
    await libraryPage.removeByTitle(SAMSARA.title)
    try {
      await profilePage.goto(friendName)
      await profilePage.addFromProfile(profilePage.commonFavorites, SAMSARA.title, 'Просмотрено')
      await expect(profilePage.addedToast(SAMSARA.title)).toBeVisible()
      await expect(
        profilePage.commonFavorites.getByRole('button', { name: 'Тайтл уже в библиотеке' }),
      ).toBeDisabled()

      await test.step('the title is in user\'s library with the chosen status', async () => {
        await libraryPage.goto(SAMSARA.title)
        const card = libraryPage.card(SAMSARA.title)
        await expect(card).toBeVisible()
        await expect(card.getByText('Просмотрено', { exact: true })).toBeVisible()
      })

      await test.step('profile: «Самсара» moved from «Любимое» to «Смотрели оба»', async () => {
        await profilePage.goto(friendName)
        await expect(profilePage.commonCard(profilePage.commonWatched, SAMSARA.title)).toBeVisible()
        await expect(profilePage.commonCard(profilePage.commonFavorites, SAMSARA.title)).toHaveCount(0)
        await expect(profilePage.commonFavorites).toContainText(`Всё любимое @${friendName} у вас уже есть`)
        await expect(profilePage.addButton(profilePage.librarySection, SAMSARA.title)).toHaveCount(0)
      })
    } finally {
      await libraryPage.removeByTitle(SAMSARA.title)
    }
  })

  test('TC-SOCIAL-007: removing the friend', async ({ page, communityPage, profilePage, libraryPage, friendPage }) => {
    await communityPage.goto()
    await expect(communityPage.friendCard(friendName)).toBeVisible()
    await communityPage.removeFriend(friendName)
    await expect(communityPage.friendCard(friendName)).toHaveCount(0)

    await test.step('saved for both sides', async () => {
      await communityPage.goto()
      await expect(communityPage.friendCard(friendName)).toHaveCount(0)
      await communityPage.searchUser(friendName)
      await communityPage.expectRelation(friendName, 'none')

      const friendCommunity = new CommunityPage(friendPage)
      await friendCommunity.goto()
      await expect(friendCommunity.friendCard(userName)).toHaveCount(0)
    })

    await test.step('the profile stays public, the comparison is gone', async () => {
      await profilePage.goto(friendName)
      await expect(profilePage.libraryCard(INCEPTION_TITLE)).toBeVisible()
      await expect(profilePage.commonTitles).toHaveCount(0)
    })

    await test.step('«У друзей» no longer lists the friend', async () => {
      // goto() resolves on `load`, i.e. after the whole streamed response — every <Suspense>
      // section, «У друзей» included (its fallback is null), is already in the DOM
      await page.goto(await libraryPage.mediaUrlOf(INCEPTION_TITLE))
      await expect(page.getByRole('heading', { level: 1, name: INCEPTION_TITLE })).toBeVisible()
      await expect(
        page.getByRole('link', { name: new RegExp(`^@${escapeRegExp(friendName)} `) }),
      ).toHaveCount(0)
    })
  })
})
