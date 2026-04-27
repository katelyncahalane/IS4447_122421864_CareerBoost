// hello wave – tiny animated emoji (expo starter leftover)

// imports
import Animated from 'react-native-reanimated';

// component
export function HelloWave() {
  // render – simple css-like animation on web / new arch path
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
