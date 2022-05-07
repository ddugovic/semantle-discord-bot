import {
  ApplicationCommand,
  InteractionHandler,
} from "@glenstack/cf-workers-discord-bot"
import { command as guessCommand, handler as guessHandler } from "./rate"
import { command as statCommand, handler as statHandler } from "./stand"

export const commands: [ApplicationCommand, InteractionHandler][] = [
  [guessCommand, guessHandler],
  [statCommand, statHandler],
]
