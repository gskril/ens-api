import { getRecords } from '@ensdomains/ensjs/public';
import { getPublicClient } from './utils';
import { normalize } from 'viem/ens';

type FetchProfileProps = {
  name: string;
  textKeys: string[];
  coinKeys: number[];
  request: Request;
  env: Env;
};

export async function fetchProfile({
  name: _name,
  textKeys,
  coinKeys,
  request,
  env,
}: FetchProfileProps) {
  const name = normalize(_name);
  const client = getPublicClient(env);

  const profile = await getRecords(client, {
    name,
    texts: textKeys,
    coins: coinKeys,
    contentHash: false,
  });

  const texts = profile.texts
    .map((text) => ({ [text.key]: text.value }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const coins = profile.coins
    .map((coin) => ({
      [coin.id]: {
        name: coin.name,
        address: coin.value,
      },
    }))
    .reduce((a, b) => ({ ...a, ...b }), {});

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const avatar = texts.avatar && {
    xs: `${baseUrl}/avatar/${name}?width=64`,
    sm: `${baseUrl}/avatar/${name}?width=128`,
    md: `${baseUrl}/avatar/${name}?width=256`,
    lg: `${baseUrl}/avatar/${name}=width=512`,
  };

  return {
    name,
    address: coins[60].address,
    avatar,
    texts,
    coins,
  };
}
