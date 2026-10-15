import type { Preview } from '@storybook/react-vite';
import './preview.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
  },
};

export default preview;
