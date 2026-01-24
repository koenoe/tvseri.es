import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import classes from './animated-icon.module.css';

const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    easing: Easing.elastic(1.2),
    transform: [{ scale: 1.2 }],
  },
  100: {
    easing: Easing.elastic(1.2),
    transform: [{ scale: 1 }],
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    easing: Easing.elastic(1.2),
    opacity: 0,
    transform: [{ scale: 1.2 }],
  },
  100: {
    easing: Easing.elastic(1.2),
    opacity: 1,
    transform: [{ scale: 1 }],
  },
});

const glowKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
  },
  [DURATION / 1000]: {
    easing: Easing.elastic(0.7),
    opacity: 1,
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
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
      >
        <div className={classes.expoLogoBackground} />
      </Animated.View>

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
    height: 128,
    position: 'absolute',
    width: 128,
  },
  container: {
    alignItems: 'center',
    position: 'absolute',
    top: 128 / 2 + 138,
    width: '100%',
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
