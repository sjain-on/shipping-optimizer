export async function auth(apiKey: string | undefined): Promise<boolean> {
  return apiKey === process.env.NEXT_PUBLIC_ADMIN_API_KEY;
}
