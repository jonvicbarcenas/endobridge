// Remembers per account whether the onboarding tour was already shown.
function tourKey(userId: string) {
  return `endobridge.tourSeen.${userId}`
}

export function hasSeenTour(userId: string) {
  try {
    return localStorage.getItem(tourKey(userId)) === '1'
  } catch {
    return true
  }
}

export function markTourSeen(userId: string) {
  try {
    localStorage.setItem(tourKey(userId), '1')
  } catch {
    // ignore: the tour may show again next time
  }
}
