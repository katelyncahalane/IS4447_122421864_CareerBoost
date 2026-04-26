// icon symbol (android + web) – map sf symbol names to material icons

// imports
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// types – mapping table typed off expo symbol names
type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

// constants – add new pairs here when you use new icon names in tabs
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'doc.text.fill': 'description',
  'folder.fill': 'folder',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
} as IconMapping;

// component
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // render – material icon chosen from mapping
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
