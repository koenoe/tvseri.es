import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

const splashKeyframe = new Keyframe({
  0: {
    opacity: 1,
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  20: {
    opacity: 1,
  },
  70: {
    easing: Easing.elastic(0.7),
    opacity: 0,
  },
  100: {
    easing: Easing.elastic(0.7),
    opacity: 0,
    transform: [{ scale: 1 }],
  },
});

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.backgroundSolidColor}
    />
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    easing: Easing.elastic(0.7),
    transform: [{ scale: 1 }],
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 1.3 }],
  },
  40: {
    easing: Easing.elastic(0.7),
    opacity: 0,
    transform: [{ scale: 1.3 }],
  },
  100: {
    easing: Easing.elastic(0.7),
    opacity: 1,
    transform: [{ scale: 1 }],
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View
        entering={glowKeyframe.duration(60 * 1000 * 4)}
        style={styles.glow}
      >
        <Image
          source={require('@/assets/images/logo-glow.png')}
          style={styles.glow}
        />
      </Animated.View>

      <Animated.View
        entering={keyframe.duration(DURATION)}
        style={styles.background}
      />
      <Animated.View
        entering={logoKeyframe.duration(DURATION)}
        style={styles.imageContainer}
      >
        <Image
          source={require('@/assets/images/expo-logo.png')}
          style={styles.image}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    height: 128,
    position: 'absolute',
    width: 128,
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#208AEF',
    zIndex: 1000,
  },
  glow: {
    height: 201,
    position: 'absolute',
    width: 201,
  },
  iconContainer: {
    alignItems: 'center',
    height: 128,
    justifyContent: 'center',
    width: 128,
    zIndex: 100,
  },
  image: {
    height: 71,
    position: 'absolute',
    width: 76,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
