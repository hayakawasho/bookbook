import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { Dialog } from './Dialog'

const meta = {
  component: Dialog,
  title: 'UI/Dialog',
  tags: ['autodocs'],
  args: {
    message: 'この操作を続けますか？',
    confirmLabel: 'はい',
    cancelLabel: 'いいえ',
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Wider: Story = {
  args: { width: 287 },
}
