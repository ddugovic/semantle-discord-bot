import _ from 'lodash'
import {
  ApplicationCommand,
  Interaction,
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  InteractionHandler,
  InteractionResponse,
  InteractionResponseType
} from "@glenstack/cf-workers-discord-bot"
import { SemantleGame } from '../game'

export const command: ApplicationCommand = {
  name: "tipp",
  description: "Wenn Sie nicht weiterkommen"
}

async function hintCommand(user: { id: string, name: string }, channelId: string): Promise<string> {
  const game = SemantleGame.todayForChannel(channelId)
  const hint = await game.fetchHint()

  if (!hint) {
    return `Schon ein Tipp? Du hast noch nichts erraten!`
  }

  let output = `${user.name} will einen Tipp!`
  output += `\nDein Tipp ist... **${hint}**!`
  return output
}

export const handler: InteractionHandler = async (
  interaction: Interaction
): Promise<InteractionResponse> => {
  try {
    const options = (interaction.data as ApplicationCommandInteractionData)
      .options as ApplicationCommandInteractionDataOption[]

    const user = {
      id: interaction.member.user.id,
      name: interaction.member.nick || interaction.member.user.username,
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: await hintCommand(user, interaction.channel_id)
      },
    }
  } catch (err: any) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: err.message,
      },
    }
  }
}
