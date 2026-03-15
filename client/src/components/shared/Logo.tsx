import { Text } from '@mantine/core'

type LogoProps = {
  size?: 'xs' | 'sm' | 'lg'
}

const sizes = { xs: 14, sm: 20, lg: 40 }

export function Logo({ size = 'sm' }: LogoProps) {
  const fontSize = sizes[size]

  return (
    <Text
      component="span"
      fw={600}
      fz={fontSize}
      style={{ fontFamily: 'var(--font-prose)', letterSpacing: '-0.02em', lineHeight: 1 }}
    >
      readingisfun
      <span style={{ color: 'var(--accent)' }}>.</span>
    </Text>
  )
}
