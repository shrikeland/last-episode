import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Сюда ведёт ссылка из письма подтверждения регистрации.
// Supabase подтверждает почту ещё на своём /verify и только потом присылает code.
// Code на сессию не меняем: PKCE-обмен работает лишь в том браузере, где была
// регистрация, а письмо часто открывают на телефоне или в почтовом клиенте.
// Поэтому всегда отправляем на логин — с тостом об успехе или об ошибке.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  if (searchParams.get('code')) {
    return NextResponse.redirect(`${origin}/login?confirmed=1`)
  }

  // Без code Supabase присылает error* параметры: ссылка устарела или уже использована
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
