// external link – open urls in in-app browser on native, normal link on web

// imports
import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

// types – same as router link but href must be string
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

// component
export function ExternalLink({ href, ...rest }: Props) {
  // render – intercept press on native to use expo web browser
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          event.preventDefault();
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
