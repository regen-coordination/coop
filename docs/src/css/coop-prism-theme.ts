import type { PrismTheme } from 'prism-react-renderer';

/**
 * Custom Prism syntax-highlighting theme using the Coop earthy palette.
 */
export const coopPrismTheme: PrismTheme = {
  plain: {
    color: '#4f2e1f', // coop-brown
    backgroundColor: '#faf5ee', // warm cream, slightly darker than page
  },
  styles: [
    // ── Comments ──
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#6b4a36', // coop-brown-soft
        fontStyle: 'italic',
      },
    },
    // ── Keywords & Tags ──
    {
      types: ['keyword', 'tag', 'important', 'atrule', 'selector'],
      style: {
        color: '#fd8a01', // coop-orange
      },
    },
    // ── Strings & Attribute Values ──
    {
      types: ['string', 'char', 'attr-value', 'template-string'],
      style: {
        color: '#5a7d10', // coop-green
      },
    },
    // ── Functions & Class Names ──
    {
      types: ['function', 'class-name'],
      style: {
        color: '#27140e', // coop-ink
        fontWeight: 'bold',
      },
    },
    // ── Numbers & Booleans ──
    {
      types: ['number', 'boolean'],
      style: {
        color: '#c46a10', // darker orange
      },
    },
    // ── Operators & Punctuation ──
    {
      types: ['operator', 'punctuation'],
      style: {
        color: '#6b4a36', // coop-brown-soft
      },
    },
    // ── Properties ──
    {
      types: ['property', 'constant', 'symbol'],
      style: {
        color: '#4f2e1f', // coop-brown
      },
    },
    // ── Variables ──
    {
      types: ['variable'],
      style: {
        color: '#4f2e1f', // coop-brown
      },
    },
    // ── Regex ──
    {
      types: ['regex'],
      style: {
        color: '#5a7d10', // coop-green
      },
    },
    // ── Attribute Names (HTML/JSX) ──
    {
      types: ['attr-name'],
      style: {
        color: '#c46a10', // darker orange
      },
    },
    // ── Built-ins ──
    {
      types: ['builtin'],
      style: {
        color: '#27140e', // coop-ink
      },
    },
    // ── Inserted / Deleted (diffs) ──
    {
      types: ['inserted'],
      style: {
        color: '#5a7d10', // coop-green
      },
    },
    {
      types: ['deleted'],
      style: {
        color: '#a63b20', // coop-error
      },
    },
  ],
};

export const coopDarkPrismTheme: PrismTheme = {
  plain: {
    color: '#f6eadb',
    backgroundColor: '#241b18',
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: {
        color: '#caa990',
        fontStyle: 'italic',
      },
    },
    {
      types: ['keyword', 'tag', 'important', 'atrule', 'selector'],
      style: {
        color: '#ffb860',
      },
    },
    {
      types: ['string', 'char', 'attr-value', 'template-string'],
      style: {
        color: '#b7d46d',
      },
    },
    {
      types: ['function', 'class-name'],
      style: {
        color: '#fff4e8',
        fontWeight: 'bold',
      },
    },
    {
      types: ['number', 'boolean'],
      style: {
        color: '#ffc884',
      },
    },
    {
      types: ['operator', 'punctuation'],
      style: {
        color: '#d4b7a3',
      },
    },
    {
      types: ['property', 'constant', 'symbol'],
      style: {
        color: '#f1ddcd',
      },
    },
    {
      types: ['variable'],
      style: {
        color: '#f1ddcd',
      },
    },
    {
      types: ['regex'],
      style: {
        color: '#c5e57a',
      },
    },
    {
      types: ['attr-name'],
      style: {
        color: '#ffb860',
      },
    },
    {
      types: ['builtin'],
      style: {
        color: '#fff4e8',
      },
    },
    {
      types: ['inserted'],
      style: {
        color: '#c5e57a',
      },
    },
    {
      types: ['deleted'],
      style: {
        color: '#ff9e7c',
      },
    },
  ],
};
