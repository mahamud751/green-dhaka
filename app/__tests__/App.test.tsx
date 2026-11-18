import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { View } from 'react-native';
import { api } from '../src/api';
jest.mock('../src/api', () => ({
  api: {
    init: jest.fn(async () => {}),
    token: '',
    request: jest.fn(async (path: string) => {
      if (path === '/config')
        return { ratesAreDemo: true, freeThreshold: 200, pickupFee: 40 };
      return [];
    }),
  },
  money: (n: number) => '৳' + n,
  track: jest.fn(),
  deviceId: jest.fn(async () => 'test-device'),
}));
test('guest can open the seller home without granting access to private data', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(
    tree!.root.findAll(
      node =>
        typeof node.props.children === 'string' &&
        node.props.children.includes('Sell Your'),
    ).length,
  ).toBeGreaterThan(0);
  expect(api.request).not.toHaveBeenCalledWith('/addresses');
  const book = tree!.root.findAll(
    node =>
      node.props.accessibilityLabel === 'Book Pickup' &&
      typeof node.props.onPress === 'function',
  )[0];
  await ReactTestRenderer.act(async () => book.props.onPress());
  expect(
    tree!.root.findAll(node => node.props.children === 'Mobile number').length,
  ).toBeGreaterThan(0);
  expect(
    tree!.root
      .findAllByType(View)
      .some(node => node.children.some(child => typeof child === 'string')),
  ).toBe(false);
  await ReactTestRenderer.act(async () => tree!.unmount());
});
