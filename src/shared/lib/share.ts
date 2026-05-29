export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function canUseNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareWithNativeSheet({
  title,
  text,
  url,
}: {
  title: string
  text?: string
  url: string
}) {
  if (!canUseNativeShare()) {
    return false
  }

  await navigator.share({
    title,
    text,
    url,
  })

  return true
}
