import {bundle} from '@remotion/bundler';
import path from 'path';
import {webpackOverride} from './src/webpack-override';

bundle({
	entryPoint: path.join(__dirname, './src/index.ts'),
	outDir: path.join(__dirname, '/dist'),
	webpackOverride,
});
