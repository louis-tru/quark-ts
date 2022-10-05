/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2015, xuewen.chu
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of xuewen.chu nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL xuewen.chu BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * ***** END LICENSE BLOCK ***** */

import utils from './util';
import {ReadStream, AsyncTask, StreamData} from './fs';
import event, {
	EventNoticer, NativeNotification, Notification, Event,
} from './event';

const _http = __require__('_http');

export enum HttpMethod {
	HTTP_METHOD_GET,
	HTTP_METHOD_POST,
	HTTP_METHOD_HEAD,
	HTTP_METHOD_DELETE,
	HTTP_METHOD_PUT,
}

export enum HttpReadyState {
	HTTP_READY_STATE_INITIAL,
	HTTP_READY_STATE_READY,
	HTTP_READY_STATE_SENDING,
	HTTP_READY_STATE_RESPONSE,
	HTTP_READY_STATE_COMPLETED,
}

declare class NativeHttpClientRequest extends Notification<Event<any, HttpClientRequest>> implements ReadStream {
	setMethod(method: HttpMethod): void;
	setUrl(url: string): void;
	setSavePath(path: string): void;
	setUsername(user: string): void;
	setPassword(pwd: string): void;
	disableCache(disable: boolean): void;
	disableCookie(disable: boolean): void;
	disableSendCookie(disable: boolean): void;
	disableSslVerify(disable: boolean): void;
	setKeepAlive(keepAlive: boolean): void;
	setTimeout(timeoutMs: number): void;
	setRequestHeader(name: string, value: string): void;
	setForm(formName: string, value: string): void;
	setUploadFile(formName: string, localPath: string): void;
	clearRequestHeader(): void;
	clearFormData(): void;
	getResponseHeader(headerName: string): string;
	getAllResponseHeaders(): Dict<string>;
	readonly uploadTotal: number;
	readonly uploadSize: number;
	readonly downloadTotal: number;
	readonly downloadSize: number;
	readonly readyState: HttpReadyState;
	readonly statusCode: number;
	readonly url: string;
	readonly httpResponseVersion: string;
	send(data?: string | Uint8Array): void;
	pause(): void;
	resume(): void;
	abort(): void;
}

/**
 * @class HttpClientRequest
 */
export class HttpClientRequest extends (_http.NativeHttpClientRequest as typeof NativeHttpClientRequest) {
	@event readonly onError: EventNoticer<Event<Error, HttpClientRequest>>;
	@event readonly onWrite: EventNoticer<Event<void, HttpClientRequest>>;
	@event readonly onHeader: EventNoticer<Event<void, HttpClientRequest>>;
	@event readonly onData: EventNoticer<Event<Uint8Array, HttpClientRequest>>;
	@event readonly onEnd: EventNoticer<Event<void, HttpClientRequest>>;
	@event readonly onReadystateChange: EventNoticer<Event<void, HttpClientRequest>>;
	@event readonly onTimeout: EventNoticer<Event<void, HttpClientRequest>>;
	@event readonly onAbort: EventNoticer<Event<void, HttpClientRequest>>;
}

utils.extendClass(HttpClientRequest, NativeNotification);

Object.assign(exports, _http);
delete exports.NativeHttpClientRequest;

export interface RequestOptions {
	url?: string;
	method?: HttpMethod;
	headers?: Dict<string>;          /* setting custom request headers */
	postData?: string | Uint8Array;  /* Non post requests ignore this option */
	save?: string;                   /* save body content to local disk */
	upload?: string;                 /* upload loacl file */
	timeout?: number;                /* request timeout time, default no timeout "0" */
	disableSslVerify?: boolean;
	disableCache?: boolean;
	disableCookie?: boolean;
}

export interface RequestResult {
	data: Uint8Array;
	httpVersion: string;
	statusCode: number;
	responseHeaders: Dict<string>;
}

export function request(options: RequestOptions): AsyncTask<RequestResult> {
	return new AsyncTask<RequestResult>(function(resolve, reject) {
		return _http.request(options, (err?: Error, r?: any)=>err?reject(err):resolve(r));
	});
}

export function requestStream(options: RequestOptions, cb: (stream: StreamData)=>void) {
	return new AsyncTask<void>(function(resolve, reject): number {
		return _http.requestStream(options, function(err?: Error, r?: StreamData) {
			if (err) {
				reject(err);
			} else {
				var stream = r as StreamData;
				cb(stream);
				if (stream.complete) {
					resolve();
				}
			}
		});
	});
};

export function requestSync(options: RequestOptions): Uint8Array {
	return _http.requestSync(options);
}

export function download(url: string, save: string) {
	return request({ url, save });
}

export function upload(url: string, localPath: string) {
	return request({ url, upload: localPath, method: HttpMethod.HTTP_METHOD_POST, disableCache: true });
}

export function get(url: string) {
	return request({ url });
}

export function getStream(url: string, cb: (stream: StreamData)=>void) {
	return requestStream({ url }, cb);
}

export function post(url: string, data: string | Uint8Array) {
	return request({ url, postData: data, method: HttpMethod.HTTP_METHOD_POST });
};

export function getSync(url: string) {
	return requestSync({ url });
}

export function postSync(url: string, data: string | Uint8Array) {
	return requestSync({ url, postData: data, method: HttpMethod.HTTP_METHOD_POST });
}

export function downloadSync(url: string, save: string) {
	return requestSync({ url, save });
}

export function uploadSync(url: string, localPath: string) {
	return requestSync({ url, upload: localPath, method: HttpMethod.HTTP_METHOD_POST, disableCache: true });
}

export declare function abort(id: number): void;
export declare function userAgent(): string;
export declare function setUserAgent(ua: string): void;
export declare function cachePath(): string;
export declare function setCachePath(path: string): void;
export declare function clearCache(): void;
export declare function clearCookie(): void;