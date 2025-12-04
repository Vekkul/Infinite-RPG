import { useState, useEffect } from 'react';

export const useTypewriter = (text: string, speed: number = 30): string => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // When the target text changes, reset the displayed text.
    setDisplayedText('');

    if (text) {
      let index = 0;
      const intervalId = setInterval(() => {
        if (index < text.length) {
          // By using substring, we make the update idempotent and not dependent on the previous state.
          // This avoids potential race conditions with state updates that can cause character skipping/duplication.
          setDisplayedText(text.substring(0, index + 1));
          index++;
        } else {
          clearInterval(intervalId);
        }
      }, speed);

      // Cleanup function to clear the interval when the component unmounts or text changes.
      return () => clearInterval(intervalId);
    }
  }, [text, speed]);

  return displayedText;
};
