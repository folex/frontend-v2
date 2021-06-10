import { ref, computed, watchEffect, watch } from 'vue';
import useTokenLists2 from './useTokenLists2';
import { getAddress } from '@ethersproject/address';
import { TokenInfo } from '@/types/TokenList';
import useConfig from './useConfig';
import TokenService from '@/services/token/token.service';
import { TOKENS } from '@/constants/tokens';
import useTokenPricesQuery from './queries/useTokenPricesQuery';

// TYPES
type TokenDictionary = { [address: string]: TokenInfo };

// STATE
const injectedTokens = ref<TokenDictionary>({});

export default function useTokens2() {
  // COMPOSABLES
  const { networkConfig } = useConfig();
  const {
    loading: loadingTokenLists,
    failed: tokenListsFailed,
    defaultTokenList: tokenList,
    all: allTokenLists
  } = useTokenLists2();

  // SERVICES
  const tokenService = new TokenService(allTokenLists);

  // COMPUTED
  const baseTokens = computed(
    (): TokenDictionary => {
      if (loadingTokenLists.value || tokenListsFailed.value) return {};

      const baseTokens = {};

      tokenList.value.tokens.forEach(token => {
        const address: string = getAddress(token.address);
        // Don't include if already included
        if (Object.keys(baseTokens).includes(address)) return;
        // Don't include if not on app network
        if (token.chainId !== networkConfig.chainId) return;

        baseTokens[address] = {
          ...token,
          address
        };
      });

      return baseTokens;
    }
  );

  const ether = computed(
    (): TokenDictionary => {
      return { [TOKENS.EthMeta.address]: TOKENS.EthMeta };
    }
  );

  const allTokens = computed(
    (): TokenDictionary => {
      return {
        ...baseTokens.value,
        ...injectedTokens.value,
        ...ether.value
      };
    }
  );

  const allAddresses = computed(() => Object.keys(allTokens.value));

  const pricesQuery = useTokenPricesQuery(allAddresses);
  const prices = computed(() =>
    pricesQuery.data.value ? pricesQuery.data.value : {}
  );

  // METHODS
  async function injectTokens(addresses: string[]): Promise<void> {
    const tokens = await tokenService.getMetadata(addresses);
    injectedTokens.value = { ...injectedTokens.value, ...tokens };
  }

  watchEffect(async () => {
    if (!loadingTokenLists.value) {
      await injectTokens(['0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F']);
      console.log('injected', injectedTokens.value);
    }
  });

  watch(prices, newPrices => {
    console.log('prices', newPrices);
    console.log(
      'injectedPrice',
      newPrices['0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F']
    );
  });

  return {
    allTokens,
    injectTokens
  };
}
