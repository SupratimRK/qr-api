declare module 'upng-js' {
	export function encode(bufs: ArrayBuffer[], w: number, h: number, cnum?: number, dels?: number[], texts?: any[]): ArrayBuffer | Uint8Array;
}
