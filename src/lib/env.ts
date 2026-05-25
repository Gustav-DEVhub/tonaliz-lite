const missingClientIdMessage =
  'Missing Jamendo client id. Add VITE_JAMENDO_CLIENT_ID to your environment variables.'

export function getJamendoClientId() {
  const clientId = import.meta.env.VITE_JAMENDO_CLIENT_ID?.trim()

  if (!clientId) {
    throw new Error(missingClientIdMessage)
  }

  return clientId
}

export function getJamendoSearchLimit() {
  return 18
}
