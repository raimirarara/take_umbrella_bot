export function getRegionFromAddress(address: string) {
  const regex = /〒\d{3}-\d{4}\s+(?:[^都道府県]*[都道府県])?([^市町村区]*[市町村区])/
  const match = address.match(regex)
  if (!match) {
    throw new Error(`Failed to get region from address: ${address}`)
  }
  return match[1]
}
