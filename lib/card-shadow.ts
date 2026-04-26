// shared shadow for list cards (light elevation reads well in demos / marking)

// imports
import { Platform, type ViewStyle } from 'react-native';

// token – subtle depth without heavy native deps
export const cardShadowStyle: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  android: { elevation: 4 },
  default: {},
});
