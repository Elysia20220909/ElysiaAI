declare module '@config/character/elisia.config' {
  export const ELISIA_DEFAULT: any;
}

declare module 'config/character/elisia.config' {
  export interface CharacterVoiceOption {
    voice_id: string
    label: string
    is_default?: boolean
    style?: string
  }

  export interface ElisiaConfig {
    character_name: string
    description: string
    ai_motivation: string
    assistant_name: string
    languages: string[]
    quote_enabled: boolean
    quotes: string[]
    default_voice_id: string
    voice_options: CharacterVoiceOption[]
    emotion_enabled?: boolean
    emotion_map?: Record<string, string>
  }

  const elisiaConfig: ElisiaConfig
  export default elisiaConfig
}

declare module '@config/character/elisia.config' {
  export * from 'config/character/elisia.config'
  import elisiaConfig from 'config/character/elisia.config'
  export default elisiaConfig
}
