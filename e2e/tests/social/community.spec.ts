// /community as a single user, read-only. Friend requests between two accounts: friends.spec.ts.
import { test, expect } from '@/fixtures'

test('TC-COMM-001: community page loads with user search input', { tag: '@smoke' }, async ({ communityPage }) => {
  await communityPage.goto()
  await expect(communityPage.heading).toBeVisible()
  await expect(communityPage.searchInput).toBeVisible()
  await expect(communityPage.friendsSection).toBeVisible()
})

test('TC-COMM-002: searching own username shows own user card without a friend button', async ({
  page,
  navbar,
  communityPage,
}) => {
  await communityPage.goto()
  // Own username is a guaranteed hit, unlike an arbitrary query against prod data
  const username = await navbar.getOwnUsername()
  // «Новые пользователи» hide as soon as the query is non-empty, so the card comes from the search
  await communityPage.searchUser(username)
  await expect(page.getByText('Новые пользователи')).toBeHidden()
  // UserCard hides the button for the current user
  await expect(communityPage.relationButton(username)).toHaveCount(0)
})
