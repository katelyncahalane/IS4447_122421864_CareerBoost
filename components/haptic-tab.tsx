// haptic tab – light vibration on ios when user presses a tab bar button

import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

// component
export function HapticTab(props: BottomTabBarButtonProps) {
  // render – default RN Pressable + optional haptics on press-in (ios only)
  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
      accessibilityRole={props.accessibilityRole}
      accessibilityState={props.accessibilityState}
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      style={props.style}>
      {props.children}
    </Pressable>
  );
}
