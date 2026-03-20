export const ADJECTIVES = [
  'Quiet', 'Bold', 'Swift', 'Calm', 'Bright',
  'Clever', 'Eager', 'Fierce', 'Gentle', 'Happy',
  'Jolly', 'Kind', 'Lively', 'Merry', 'Noble',
  'Proud', 'Quick', 'Rare', 'Sharp', 'Tender',
  'Unique', 'Vivid', 'Warm', 'Zesty', 'Daring',
  'Fuzzy', 'Humble', 'Icy', 'Jade', 'Lucky',
]

export const NOUNS = [
  'Sparrow', 'Mango', 'Panda', 'Falcon', 'Otter',
  'Maple', 'Raven', 'Lynx', 'Coral', 'Dingo',
  'Eagle', 'Finch', 'Gecko', 'Heron', 'Ibis',
  'Jaguar', 'Koala', 'Lemur', 'Moose', 'Newt',
  'Osprey', 'Plover', 'Quail', 'Robin', 'Stork',
  'Toucan', 'Urubu', 'Viper', 'Walrus', 'Xerus',
]

export function getRandomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adjective} ${noun}`
}
