import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import ts from 'rollup-plugin-typescript2';
import { eslint } from 'rollup-plugin-eslint';
import terser from '@rollup/plugin-terser';
import wasm from '@rollup/plugin-wasm';
const packageJSON = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const getPath = (_path) => path.resolve(__dirname, _path);

const isDev = process.env.ROLLUP_WATCH || false;

const extensions = ['.js', '.ts', '.tsx', '.json', '.wasm'];

// ts
const tsPlugin = ts({
  tsconfig: getPath('./tsconfig.json'),
  extensions,
});

// eslint
const esPlugin = eslint({
  throwOnError: true,
  include: ['src/**/*.ts'],
  exclude: ['node_modules/**', 'lib/**', 'dist/**'],
});

// 基础配置
const commonConf = {
  input: getPath('./src/index.ts'),
  plugins: [
    resolve({ browser: true }, extensions),
    commonjs(),
    esPlugin,
    tsPlugin,
    !isDev && terser(),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss'],
      exclude: '**/node_modules/**',
    }),
    wasm(),
  ],
  external: [
    'axios',
    '@protobuf-ts/plugin',
    'js-sha3',
    'js-sha256',
    '@noble/ed25519',
    'qrcode',
    // 'get-starknet', // 暂时不能做为外部依赖，只能先打到js包里面
    'starknet',
    'web3mq_mls',
  ],
};

// 需要导出的模块类型
const outputMap = [
  {
    file: packageJSON.main,
    format: 'cjs',
    globals: {
      axios: 'axios',
      '@noble/ed25519': 'ed',
      '@protobuf-ts/plugin': 'pb',
      'js-sha3': 'js-sha3',
      'get-starknet': 'get-starknet',
      'js-sha256': 'js-sha256',
      starknet: 'starknet',
      web3mq_mls: 'web3mq_mls',
      qrcode: 'qrcode',
    },
    inlineDynamicImports: true,
  },
  // {
  //   file: packageJSON.module,
  //   format: 'es',
  //   globals: {
  //     axios: 'Axios',
  //     mqtt: 'mqtt',
  //   },
  // },
];

const buildConf = (options) => Object.assign({}, commonConf, options);

export default outputMap.map((output) =>
  buildConf({ output: { name: packageJSON.name, ...output } }),
);
