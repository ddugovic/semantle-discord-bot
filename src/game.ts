import _ from "lodash"
import { secretWords } from "./secretWords"


export type RecordedGuess = {
  user: { id: string, name: string },
  guessNumber: number
  word: string
  similarity: number
  percentile?: number
}

export type GuessResult = {
  code: 'unknown'
} | {
  code: 'found' | 'warm' | 'cold' | 'duplicate'
  guess: RecordedGuess
  guesses: RecordedGuess[]
}

type SimilarityResponse = {
  similarity: 'unknown' | number
  percentile?: number
}

export class SemantleGame {
  static get secretWordToday() {
    const today = Math.floor(Date.now() / 86400000)
    const initialDay = 19021
    const puzzleNumber = (today - initialDay) % secretWords.length
    return secretWords[puzzleNumber]
  }

  static todayForChannel(channelId: string) {
    return new SemantleGame(channelId, this.secretWordToday)
  }

  dayNumber: number
  timeSinceStart: number
  timeUntilNext: number

  constructor(readonly channelId: string, readonly secret: string) {
    const now = Date.now()
    const nowInDays = now / 86400000
    this.dayNumber = Math.floor(nowInDays)
    this.timeSinceStart = (nowInDays - Math.floor(nowInDays)) * 86400000
    this.timeUntilNext = (Math.ceil(nowInDays) - nowInDays) * 86400000
  }


  async getGuesses() {
    const { channelId, dayNumber } = this
    return (await KV.get(`guesses/${channelId}/${dayNumber}`, 'json') as RecordedGuess[] | null) || []
  }

  async guess(user: { id: string, name: string }, word: string): Promise<GuessResult> {
    const { channelId } = this
    word = word.replace(/\ /gi, "_")

    let guesses = await this.getGuesses()

    const duplicateGuess = guesses.find(g => g.word.toLowerCase() === word.toLowerCase())
    if (duplicateGuess) {
      return {
        code: 'duplicate',
        guess: duplicateGuess,
        guesses
      }
    }

    // Recording a new guess

    const response = await fetch(`https://demantle.toggly.workers.dev/similarity/${this.secret}/${word}`)

    if (response.status !== 200) {
      throw new Error(`Semantle Error: ${response.status} ${response.statusText} ${await response.text()}`)
    }

    const { similarity, percentile } = await response.json() as SimilarityResponse

    if (similarity === 'unknown') {
      return {
        code: 'unknown'
      }
    }

    const guess = {
      user,
      guessNumber: guesses.length + 1,
      word,
      similarity,
      percentile
    }

    guesses.push(guess)
    guesses = _.sortBy(guesses, g => -g.similarity)
    await KV.put(`guesses/${channelId}/${this.dayNumber}`, JSON.stringify(guesses))

    let code: GuessResult['code'] = 'cold'
    if (percentile === 1000) {
      code = 'found'
    } else if (percentile !== undefined) {
      code = 'warm'
    }

    return {
      code, guess, guesses
    }
  }
}