const MAX_MESSAGE_LENGTH = 2000
const MAX_CONVERSATION_LENGTH = 50

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export interface ValidateInputOptions {
  message: string
  conversationLength: number
}

export function validateInput({ message, conversationLength }: ValidateInputOptions): void {
  if (!message || message.trim().length === 0) {
    throw new ValidationError('Message cannot be empty')
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`)
  }
  if (conversationLength > MAX_CONVERSATION_LENGTH) {
    throw new ValidationError(`Conversation has too many messages (max ${MAX_CONVERSATION_LENGTH}). Please start a new conversation.`)
  }
}
