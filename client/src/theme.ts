import { MantineThemeOverride, rem, MantineColorsTuple } from '@mantine/core'

// Terracotta accent — #da7756 (dark) / #c2623e (light) as base
const terracottaScale: MantineColorsTuple = [
  '#faf0ec', // 0
  '#f0d9cf', // 1
  '#e6c1b1', // 2
  '#dca993', // 3
  '#e08d6f', // 4 - accent-hover (dark)
  '#da7756', // 5 - accent (dark)
  '#c2623e', // 6 - accent (light)
  '#a8522f', // 7 - accent-hover (light)
  '#8e4225', // 8
  '#74321b', // 9
]

// Neutral surface colors (warm grays)
const neutralScale: MantineColorsTuple = [
  '#faf7f5', // 0 - light bg
  '#f3efeb', // 1
  '#eae5e0', // 2
  '#ddd7d0', // 3
  '#cfc8c0', // 4
  '#b8b0a6', // 5
  '#a89f95', // 6
  '#7a7168', // 7
  '#5a524a', // 8
  '#2a2420', // 9 - light text
]

// Dark theme scale — warm browns matching our surfaces
const darkScale: MantineColorsTuple = [
  '#ebe5df', // 0 - text
  '#a89f95', // 1 - text-2
  '#7a7168', // 2 - text-3
  '#5a524a', // 3 - text-4 / border-hover
  '#4a433b', // 4 - border / s4
  '#3d3731', // 5 - s3
  '#332e28', // 6 - s2
  '#2a2520', // 7 - s1
  '#211e1a', // 8 - s0
  '#1a1714', // 9 - base
]

// Dark theme surfaces
const darkSurfaces = {
  base: '#1a1714',
  s0: '#211e1a',
  s1: '#2a2520',
  s2: '#332e28',
  s3: '#3d3731',
  s4: '#4a433b',
}

const darkSemanticColors = {
  green: '#7dba6e',
  greenSubtle: 'rgba(125, 186, 110, 0.1)',
  amber: '#d4a44a',
  amberSubtle: 'rgba(212, 164, 74, 0.1)',
  red: '#cf6565',
  redSubtle: 'rgba(207, 101, 101, 0.1)',
  info: '#6a9fd8',
}

const lightSemanticColors = {
  green: '#3d8c2f',
  greenSubtle: 'rgba(61, 140, 47, 0.08)',
  amber: '#9a7520',
  amberSubtle: 'rgba(154, 117, 32, 0.08)',
  red: '#c04040',
  redSubtle: 'rgba(192, 64, 64, 0.1)',
  info: '#3a75b0',
}

// Syntax highlighting colors
const darkSyntax = {
  keyword: '#d4a44a',
  type: '#6a9fd8',
  string: '#7dba6e',
  comment: '#5a524a',
  function: '#ebe5df',
  operator: '#a89f95',
  number: '#da7756',
}

const lightSyntax = {
  keyword: '#9a7520',
  type: '#3a75b0',
  string: '#3d8c2f',
  comment: '#a89f95',
  function: '#2a2420',
  operator: '#5a524a',
  number: '#c2623e',
}

export const theme: MantineThemeOverride = {
  primaryColor: 'terracotta',
  primaryShade: { light: 6, dark: 5 },

  colors: {
    terracotta: terracottaScale,
    neutral: neutralScale,
    dark: darkScale,
    gray: neutralScale,
  },

  fontFamily: 'var(--font-ui)',
  fontFamilyMonospace: 'var(--font-mono)',
  headings: {
    fontFamily: 'var(--font-prose)',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(32), lineHeight: '1.3' },
      h2: { fontSize: rem(28), lineHeight: '1.35' },
      h3: { fontSize: rem(24), lineHeight: '1.4' },
      h4: { fontSize: rem(20), lineHeight: '1.45' },
      h5: { fontSize: rem(16), lineHeight: '1.5' },
      h6: { fontSize: rem(14), lineHeight: '1.55' },
    },
  },

  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
  },

  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },

  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.12)',
    sm: '0 2px 6px rgba(0, 0, 0, 0.15)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    xl: '0 16px 32px rgba(0, 0, 0, 0.25)',
  },

  other: {
    // Layout dimensions
    topbarHeight: rem(48),
    sidebarWidth: rem(268),
    chatWidth: rem(400),

    // Syntax highlighting tokens
    darkSyntax,
    lightSyntax,

    // Custom palette references
    darkSurfaces,
    darkSemanticColors,
    lightSemanticColors,
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 150ms ease',
        },
      },
    },

    Text: {
      defaultProps: {
        c: 'inherit',
      },
    },

    Code: {
      styles: {
        root: {
          fontFamily: 'var(--font-mono)',
          fontSize: rem(13),
          fontWeight: 400,
        },
      },
    },

    Input: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        input: {
          fontFamily: 'var(--font-ui)',
          transition: 'all 150ms ease',
        },
      },
    },

    Textarea: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        input: {
          fontFamily: 'var(--font-ui)',
        },
      },
    },

    Select: {
      defaultProps: {
        radius: 'md',
      },
    },

    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },

    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
    },

    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },

    Tooltip: {
      defaultProps: {
        radius: 'md',
      },
    },
  },

  cursorType: 'pointer',
}

export const cssVariablesResolver = () => ({
  variables: {
    // Surface colors
    '--surface-0': darkSurfaces.s0,
    '--surface-1': darkSurfaces.s1,
    '--surface-2': darkSurfaces.s2,
    '--surface-3': darkSurfaces.s3,
    '--surface-4': darkSurfaces.s4,

    // Text colors
    '--text': '#ebe5df',
    '--text-secondary': '#a89f95',
    '--text-tertiary': '#7a7168',
    '--text-disabled': '#5a524a',

    // Accent
    '--accent': '#da7756',
    '--accent-hover': '#e08d6f',
    '--accent-subtle': 'rgba(218, 119, 86, 0.1)',
    '--accent-muted': 'rgba(218, 119, 86, 0.16)',

    // Borders
    '--border-subtle': '#3a342d',
    '--border': '#4a433b',
    '--border-hover': '#5a524a',
    '--border-focus': '#da7756',

    // Semantic
    '--success': darkSemanticColors.green,
    '--success-subtle': darkSemanticColors.greenSubtle,
    '--warning': darkSemanticColors.amber,
    '--warning-subtle': darkSemanticColors.amberSubtle,
    '--error': darkSemanticColors.red,
    '--error-subtle': darkSemanticColors.redSubtle,
    '--info': darkSemanticColors.info,

    // Backgrounds
    '--bg-base': darkSurfaces.base,
    '--bg-elevated': darkSurfaces.s0,
    '--bg-hover': darkSurfaces.s1,

    // Code/AI specific
    '--code-bg': '#1e1a16',
    '--ai-bg': '#252019',
    '--ai-border': '#5a3f2e',
    '--ai-accent': '#da7756',

    // Syntax highlighting
    '--syntax-keyword': darkSyntax.keyword,
    '--syntax-type': darkSyntax.type,
    '--syntax-string': darkSyntax.string,
    '--syntax-comment': darkSyntax.comment,
    '--syntax-function': darkSyntax.function,
    '--syntax-operator': darkSyntax.operator,
    '--syntax-number': darkSyntax.number,

    // Shadows
    '--shadow': 'rgba(0, 0, 0, 0.3)',
    '--shadow-heavy': 'rgba(0, 0, 0, 0.5)',
  },

  dark: {
    '--surface-0': darkSurfaces.s0,
    '--surface-1': darkSurfaces.s1,
    '--surface-2': darkSurfaces.s2,
    '--surface-3': darkSurfaces.s3,
    '--surface-4': darkSurfaces.s4,
    '--text': '#ebe5df',
    '--text-secondary': '#a89f95',
    '--text-tertiary': '#7a7168',
    '--text-disabled': '#5a524a',
    '--accent': '#da7756',
    '--accent-hover': '#e08d6f',
    '--accent-subtle': 'rgba(218, 119, 86, 0.1)',
    '--accent-muted': 'rgba(218, 119, 86, 0.16)',
    '--border-subtle': '#3a342d',
    '--border': '#4a433b',
    '--border-hover': '#5a524a',
    '--border-focus': '#da7756',
    '--success': darkSemanticColors.green,
    '--success-subtle': darkSemanticColors.greenSubtle,
    '--warning': darkSemanticColors.amber,
    '--warning-subtle': darkSemanticColors.amberSubtle,
    '--error': darkSemanticColors.red,
    '--error-subtle': darkSemanticColors.redSubtle,
    '--info': darkSemanticColors.info,
    '--bg-base': darkSurfaces.base,
    '--bg-elevated': darkSurfaces.s0,
    '--bg-hover': darkSurfaces.s1,
    '--code-bg': '#1e1a16',
    '--ai-bg': '#252019',
    '--ai-border': '#5a3f2e',
    '--ai-accent': '#da7756',
    '--syntax-keyword': darkSyntax.keyword,
    '--syntax-type': darkSyntax.type,
    '--syntax-string': darkSyntax.string,
    '--syntax-comment': darkSyntax.comment,
    '--syntax-function': darkSyntax.function,
    '--syntax-operator': darkSyntax.operator,
    '--syntax-number': darkSyntax.number,
    '--shadow': 'rgba(0, 0, 0, 0.3)',
    '--shadow-heavy': 'rgba(0, 0, 0, 0.5)',
  },

  light: {
    '--surface-0': '#f3efeb',
    '--surface-1': '#eae5e0',
    '--surface-2': '#ddd7d0',
    '--surface-3': '#cfc8c0',
    '--surface-4': '#b8b0a6',
    '--text': '#2a2420',
    '--text-secondary': '#5a524a',
    '--text-tertiary': '#7a7168',
    '--text-disabled': '#a89f95',
    '--accent': '#c2623e',
    '--accent-hover': '#a8522f',
    '--accent-subtle': 'rgba(194, 98, 62, 0.08)',
    '--accent-muted': 'rgba(194, 98, 62, 0.12)',
    '--border-subtle': '#e0d9d1',
    '--border': '#cfc8c0',
    '--border-hover': '#b8b0a6',
    '--border-focus': '#c2623e',
    '--success': lightSemanticColors.green,
    '--success-subtle': lightSemanticColors.greenSubtle,
    '--warning': lightSemanticColors.amber,
    '--warning-subtle': lightSemanticColors.amberSubtle,
    '--error': lightSemanticColors.red,
    '--error-subtle': lightSemanticColors.redSubtle,
    '--info': lightSemanticColors.info,
    '--bg-base': '#faf7f5',
    '--bg-elevated': '#f3efeb',
    '--bg-hover': '#eae5e0',
    '--code-bg': '#f0ebe5',
    '--ai-bg': '#f5f0eb',
    '--ai-border': '#d8cfc5',
    '--ai-accent': '#c2623e',
    '--syntax-keyword': lightSyntax.keyword,
    '--syntax-type': lightSyntax.type,
    '--syntax-string': lightSyntax.string,
    '--syntax-comment': lightSyntax.comment,
    '--syntax-function': lightSyntax.function,
    '--syntax-operator': lightSyntax.operator,
    '--syntax-number': lightSyntax.number,
    '--shadow': 'rgba(0, 0, 0, 0.08)',
    '--shadow-heavy': 'rgba(0, 0, 0, 0.15)',
  },
})
