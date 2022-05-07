import _ from 'lodash'
import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  Interaction,
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  InteractionHandler,
  InteractionResponse,
  InteractionResponseType
} from "@glenstack/cf-workers-discord-bot"
import { SemantleGame } from '../game'
import { renderDuration, renderPercentile } from '../rendering'

export const command: ApplicationCommand = {
  name: "rate",
  description: "Eine Semantle-Rate erstellen",
  options: [
    {
      name: "wort",
      description: "Das Wort zu erraten",
      type: ApplicationCommandOptionType.STRING,
      required: true
    },
  ],
}

async function guessCommand(user: { id: string, name: string }, channelId: string, word: string): Promise<string> {
  const game = SemantleGame.todayForChannel(channelId)
  const res = await game.guess(user, word)

  if (res.code === 'unknown') {
    return `Ich kenne das Wort **${word}** nicht...`
  }

  const { guess } = res

  let output = `${user.name} rät **${guess.word}**!`

  if (res.code === 'duplicate') {
    output += `\n${guess.user.name} hat bereits **${word}** erraten! Ähnlichkeit: **${guess.similarity.toFixed(2)}** ${renderPercentile(guess.percentile)}`
    return output
  }

  if (res.code === 'found') {
    output += ` ${guess.user.name} gewinnt! Das geheime Wort ist **${guess.word}**.`
  } else {
    output += ` Similarity: **${guess.similarity.toFixed(2)}** ${renderPercentile(guess.percentile)}`
  }

  if (res.code === 'found') {
    output += `\nSie haben es in **${guess.guessNumber}** Anläufen gefunden.`
    output += `\nDas nächste Spiel wird in ${renderDuration(game.timeUntilNext)} fertig sein.`
  }

  return output
}

export const handler: InteractionHandler = async (
  interaction: Interaction
): Promise<InteractionResponse> => {
  try {
    const options = (interaction.data as ApplicationCommandInteractionData)
      .options as ApplicationCommandInteractionDataOption[]

    const word = (options.find(
      (option) => option.name === "word"
    ) as ApplicationCommandInteractionDataOption).value

    const user = {
      id: interaction.member.user.id,
      name: interaction.member.nick || interaction.member.user.username,
    }

    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: await guessCommand(user, interaction.channel_id, word)
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
