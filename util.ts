/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2015, blue.chu
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of blue.chu nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL blue.chu BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

import './_ext';
import _util, {__set_listener__,getConfig} from './_util';
import * as _common from './_common';
import {Event, EventNoticer, Notification, } from './_event';

class RuntimeEvents extends Notification {
	private _handles: {[key: string]: (noticer: EventNoticer, ...args: any[])=>any} = {
		UncaughtException: (noticer: EventNoticer, err: Error)=>
			noticer.length ? (noticer.trigger(err), true): false,
		UnhandledRejection: (noticer: EventNoticer, reason: Error, promise: Promise<any>)=>
			noticer.length ? (noticer.trigger({ reason, promise }), true): false,
		BeforeExit: (noticer: EventNoticer, code = 0)=>(noticer.trigger(code),code),
		Exit: (noticer: EventNoticer, code = 0)=>(noticer.trigger(code),code),
	};
	getNoticer(name: 'UncaughtException'|'UnhandledRejection'|'BeforeExit'|'Exit') {
		if (!this.hasNoticer(name)) {
			let noticer = super.getNoticer(name);
			let handle = (this._handles)[name];
			if (handle) {
				__set_listener__(name, (...args: any[])=>{
					handle(noticer, ...args);
				});
			}
		}
		return super.getNoticer(name);
	}
}

export const _runtimeEvents = new RuntimeEvents();

export default {
	..._util,
	..._common,
	get id() {
		return _common.getId();
	},
	get config() {
		return getConfig();
	},
	get onBeforeExit(): EventNoticer<Event<object, number>> {
		return _runtimeEvents.getNoticer('BeforeExit');
	},
	get onExit(): EventNoticer<Event<object, number>> {
		return _runtimeEvents.getNoticer('BeforeExit');
	},
	get onUncaughtException(): EventNoticer<Event<object, Error>> {
		return _runtimeEvents.getNoticer('UncaughtException');
	},
	get onUnhandledRejection(): EventNoticer<Event<object, {reason: Error, promise: Promise<any>}>> {
		return _runtimeEvents.getNoticer('UnhandledRejection');
	},
}