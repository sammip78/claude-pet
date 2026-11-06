export type Mood = 'idle' | 'working' | 'happy' | 'oops'

export type Avatar = {
  name: string
  outfit: string
  palette: Record<string, string>
  body: string[]
  faces: Record<Exclude<Mood, 'idle'>, Record<string, string>>
}

declare module 'claude-code' {
  interface PluginState {
    pet: {
      mood: Mood
      line: string | null
      isQuiet: boolean
      isRed: boolean
      avatar: Avatar
    }
  }
}
