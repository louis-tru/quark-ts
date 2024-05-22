/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright © 2015-2016, blue.chu
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

import util from './util';
import { Label, View, DOM } from './view';
import { Window } from './window';
import * as view from './view';

const assertDev = util.assert;
const RenderQueueSet = new Set<ViewController>();
let   RenderQueueWorking = false;
const WarnRecord = new Set();
const WarnDefine = {
	UndefinedDOMKey: 'DOM key no defined in DOM Collection',
} as Dict<string>;

function warn(id: string, msg = '') {
	if (!WarnRecord.has(id)) {
		WarnRecord.add(id);
		let def = WarnDefine[id];
		if (def) {
			console.warn(def, msg);
		}
	}
}

const InvalidDOM: DOM = {
	ref: '',
	get owner(): ViewController { throw Error.new('Not implemented') },
	get metaView(): View { throw Error.new('Not implemented') },
	remove() { throw Error.new('Not implemented') },
	appendTo(){ throw Error.new('Not implemented') },
	afterTo(){ throw Error.new('Not implemented') },
};

interface DOMConstructor {
	new(window: Window, ...args: any[]): DOM;
	readonly isViewController: boolean;
}

export class VirtualDOM {
	readonly newDom: DOMConstructor;
	readonly children: (VirtualDOM | null)[];
	readonly props: Readonly<Dict>;
	readonly hashProp: number;
	readonly hashProps: Map<string, number>; // prop => hanshCode
	readonly hash: number;
	readonly dom: DOM;

	constructor(newDom: DOMConstructor, props: Dict | null, children: (VirtualDOM | null)[]) {
		let hashProp = 5381;
		if (props) {
			let hashProps = new Map();
			for (let prop in props) {
				let value = props[prop];
				let hashCode = (prop.hashCode() << 5) + Object.hashCode(value);
				hashProps.set(prop, hashCode);
				hashProp += (hashProp << 5) + hashCode;
			}
			this.props = props;
			this.hashProps = hashProps;
		}
		let hash = (newDom.hashCode() << 5) + hashProp;

		if (children.length) {
			for (let vdom of children) {
				if (vdom)
					hash += (hash << 5) + vdom.hash;
			}
			this.children = children;
		}
		this.newDom = newDom;
		this.hash = hash;
		this.hashProp = hashProp;
	}

	getPropHash(prop: string): number | undefined {
		return this.hashProps.get(prop);
	}

	diffProps(window: Window, vdomOld: VirtualDOM) {
		if (this.hashProp !== vdomOld.hashProp) {
			let props = this.props;
			for (let [key,hash] of this.hashProps) {
				if (vdomOld.getPropHash(key) != hash) {
					(this.dom as any)[key] = props[key];
				}
			}
		}
	}

	newInstance<P = {}, S = {}>(owner: ViewController<P,S>): DOM {
		assertDev(this.dom === InvalidDOM);
		let window = owner.window;
		if (this.newDom.isViewController) {
			let newCtr = new this.newDom(window, {
				owner: owner, props: this.props, children: this.children,
			}) as ViewController;
			(this as {dom:DOM}).dom = newCtr;
			let r = (newCtr as any).triggerLoad(); // trigger event Load
			if (r instanceof Promise) {
				r.then(()=>{
					(newCtr as any).isLoaded = true;
					markRerender(newCtr);
				});
			} else {
				(newCtr as {isLoaded:boolean}).isLoaded = true;
			}
			setRef(newCtr, this.props.ref || '');
			rerender(newCtr); // rerender
		} else {
			let view = new this.newDom(window) as View;
			let prev: View | null = null;
			(this as {dom:DOM}).dom = view;
			(view as {owner:ViewController}).owner = owner;
			for (let vdom of this.children) {
				if (vdom) {
					if (prev) {
						prev = vdom.newInstance(owner).afterTo(prev);
					} else {
						prev = vdom.newInstance(owner).appendTo(view);
					}
				}
			}
			Object.assign(view, this.props);
		}
		return this.dom;
	}
}
Object.assign(VirtualDOM.prototype, {
	children: [], props: {}, hashProps: new Map, dom: InvalidDOM,
});

class VirtualDOMText extends VirtualDOM {
	readonly value: string;
	static fromString(value: string): VirtualDOM {
		return {
			__proto__: VirtualDOMText.prototype,
			value,
			hash: value.hashCode(),
		} as unknown as VirtualDOMText;
	}
	getPropHash(prop: string) {
		return this.hash;
	}
	setProps(window: Window, vdomOld: VirtualDOM): void {
		if (vdomOld.getPropHash('value') != this.hash) {
			(this.dom as any).value = this.value;
		}
	}
	newInstance<P = {}, S = {}>(owner: ViewController<P,S>): DOM {
		let view = new Label(owner.window);
		(this as {dom:DOM}).dom = view;
		(view as {owner:ViewController}).owner = owner;
		view.value = this.value;
		return view;
	}
}
util.extend(VirtualDOMText.prototype, {
	newDom: Label, get hashProp() {return this.hash},
});

function getKey(vdom: VirtualDOM, autoKey: number): string {
	let key: string;
	let key_ = vdom.props.key;
	if (key_ !== undefined) {
		key = key_;
	} else {
		key = String(autoKey); // auto number key
		warn('UndefinedDOMKey');
	}
	return key;
}

class VirtualDOMCollection extends VirtualDOM {
	collection: VirtualDOM[];
	keys = new Map<string, VirtualDOM>;

	constructor(collection: (VirtualDOM | null)[]) {
		super(DOMCollection, null, []);
		let _collection = [];
		let hash = this.hash;
		for (let e of collection) {
			if (e) {
				hash += (hash << 5) + e.hash;
				_collection.push(e);
			}
		}
		if (!_collection.length) {
			let first = new VirtualDOM(View, null, []);
			hash += (hash << 5) + first.hash;
			_collection.push(first);
		}
		(this as {hash:number}).hash = hash;
		this.collection = _collection;
	}

	diffProps(window: Window, vdomOld: VirtualDOM) {
		let { collection: collectionOld, keys: keysOld } = this as VirtualDOMCollection;
		let dom = this.dom as DOMCollection;
		let owner = dom.owner;
		let keysNew = new Map<string, VirtualDOM>();
		let prev = vdomOld.dom.metaView; assertDev(prev);
		let collectionNew = this.collection;

		collectionNew.forEach(function(cell, i) {
			let key = getKey(cell, i);
			if (keysNew.has(key))
				throw new Error('DOM Key definition duplication in DOM Collection, = ' + key);
			keysNew.set(key, cell);

			let vdomOld = keysOld.get(key);
			if (vdomOld) {
				if (vdomOld.hash !== cell.hash) {
					prev = diff(owner, vdomOld, cell); // diff
				} else { // use old dom
					keysNew.set(key, vdomOld);
					collectionNew[i] = vdomOld;
					prev = vdomOld.dom.afterTo(prev);
				}
				keysOld.delete(key);
			} else { // no key
				prev = cell.newInstance(owner).afterTo(prev);
			}
		});
		this.keys = keysNew;

		for (let [_,v] of keysOld) {
			removedom(v, owner);
		}
	}

	newInstance<P = {}, S = {}>(owner: ViewController<P, S>): DOM {
		assertDev(this.dom === InvalidDOM);
		(this as {dom:DOM}).dom = new DOMCollection(owner.window, owner, this);
		let keys = this.keys;
		this.collection.forEach(function(cell,i) {
			let key = getKey(cell, i);
			if (key in keys)
				throw new Error('DOM Key definition duplication in DOM Collection, = ' + key);
			cell.newInstance(owner);
			keys.set(key, cell);
		});
		return this.dom;
	}
}

class DOMCollection implements DOM {
	private _vdom: VirtualDOMCollection;
	private _ref: string;
	readonly owner: ViewController;
	get ref() { return this._ref }
	get metaView() {
		return this._vdom.collection.indexReverse(0).dom.metaView;
	}
	constructor(window: Window, owner: ViewController, vdom: VirtualDOMCollection) {
		this._vdom = vdom;
		this.owner = owner;
	}
	remove() {
		for (let vdom of this._vdom.collection)
			removedom(vdom, this.owner);
		this._vdom.collection = [];
		this._vdom.keys.clear();
	}
	appendTo(parent: View) {
		for (let cell of this._vdom.collection)
			cell.dom.appendTo(parent);
		return this.metaView;
	}
	afterTo(prev: View) {
		for (let cell of this._vdom.collection)
			prev = cell.dom.afterTo(prev);
		return prev;
	}
	static readonly isViewController = false;
}
Object.assign(DOMCollection.prototype, {_ref: ''});

function removesubctr<T>(vdom: VirtualDOM, owner: ViewController<T>) {
	for (let e of vdom.children) {
		if (e) {
			if (e.newDom.isViewController) {
				e.dom.remove(); // remove ctrl
			} else {
				removesubctr(e, owner);
			}
		}
	}
	let ref = vdom.dom.ref;
	if (ref) {
		if (owner.refs[ref] === vdom.dom) {
			delete (owner.refs as Dict<DOM>)[ref];
		}
	}
}

function removedom<T>(vdom: VirtualDOM, owner: ViewController<T>) {
	removesubctr(vdom, owner);
	vdom.dom.remove();
}

function setRef(dom: View | ViewController, ref: string) {
	let _ref = (dom as any)._ref;
	if (_ref !== ref) {
		let refs = dom.owner!.refs as Dict<ViewController | View>;
		if (refs[_ref] === dom) {
			delete refs[_ref];
		}
		if (ref)
			refs[ref] = dom;
		(dom as any)._ref = ref;
	}
}

function markRerender<T>(ctr: ViewController<T>) {
	let size = RenderQueueSet.size;
	RenderQueueSet.add(ctr as ViewController);
	if (size == RenderQueueSet.size)
		return;

	if (!RenderQueueWorking) {
		RenderQueueWorking = true;
		util.nextTick(function() {
			try {
				for( let item of RenderQueueSet ) {
					rerender(item);
				}
			} finally {
				RenderQueueWorking = false;
			}
		});
	}
}

function diff(owner: ViewController, vdomOld: VirtualDOM, vdomNew: VirtualDOM): View {
	if (vdomNew.newDom !== vdomOld.newDom) { // diff type
		let prev = vdomOld.dom.metaView; assertDev(prev);
		let dom = vdomNew.newInstance(owner).afterTo(prev);
		removedom(vdomOld, owner); // del dom
		return dom;
	}
	let dom = vdomOld.dom;
	(vdomNew as {dom:DOM}).dom = dom;

	if ( vdomNew.newDom.isViewController ) {
		let ctr = dom as ViewController;
		(ctr as {props:any}).props = vdomNew.props;
		(ctr as {children:any}).children = vdomNew.children;
		setRef(ctr, vdomNew.props.ref || '');
		rerender(ctr); // rerender
	} else {
		// diff and set props
		vdomNew.diffProps(owner.window, vdomOld);
		setRef(dom as View, vdomNew.props.ref || '');

		let childrenOld = vdomOld.children, childrenNew = vdomNew.children;
		let len = Math.max(childrenOld.length, childrenNew.length);
		let prev: View | null = null;

		for (let i = 0; i < len; i++) {
			let vdomOld = childrenOld[i], vdomNew = childrenNew[i];
			if (vdomOld) {
				if (vdomNew) {
					if (vdomOld.hash !== vdomNew.hash) {
						prev = diff(owner, vdomOld, vdomNew); // diff
					} else {
						childrenNew[i] = vdomOld;
						prev = vdomOld.dom.metaView;
					}
				} else {
					removedom(vdomOld, owner); // remove DOM
				}
			} else if (vdomNew) {
				if (prev) {
					prev = vdomNew.newInstance(owner).afterTo(prev);
				} else {
					prev = vdomNew.newInstance(owner).appendTo(dom.metaView);
				}
			}
		}
	} // if (vdomNew.newDom.isViewController)

	return dom.metaView;
}

export type Args<P> = {
	owner: ViewController,
	props: Readonly<P>,
	children: (VirtualDOM | null)[],
};

export class ViewController<P = {}, S = {}> implements DOM {
	private _hashStates = new Map<string, number>;
	private _ref: string;
	private _vdom?: VirtualDOM; // render result
	private _removeFlag?: boolean;
	private _rerenderCbs?: (()=>void)[]; // rerender callbacks
	readonly window: Window;
	readonly owner: ViewController;
	readonly children: (VirtualDOM | null)[]; // outer children
	readonly props: Readonly<P>;
	readonly state: Readonly<S> = {} as S;
	readonly isLoaded: boolean;
	readonly isMounted: boolean;
	readonly isDestroy: boolean;
	readonly refs: Readonly<Dict<ViewController | View>> = {};

	get metaView() { return this._vdom!.dom.metaView }
	get ref() { return this._ref }
	set ref(value) { setRef(this, value) }
	get dom() { return this._vdom!.dom }

	static rerender(self: ViewController) {
		RenderQueueSet.delete(self); // delete mark
		let vdomOld = self._vdom;
		let vdomNew = _CVDD(self.render());
		let update = false;

		if (vdomOld) {
			if (vdomNew) {
				if (vdomOld.hash !== vdomNew.hash) {
					self._vdom = vdomNew; // use new vdom
					diff(self, vdomOld, vdomNew); // diff
					update = true;
				}
			} else {
				let prev = vdomOld.dom.metaView; assertDev(prev);
				self._vdom = new VirtualDOM(View, null, []);
				self._vdom.newInstance(self);
				(self._vdom.dom as View).afterTo(prev);
				removedom(vdomOld, self); // del dom
				update = true;
			}
		} else { // once rerender
			self._vdom = vdomNew || new VirtualDOM(View, null, []);
			self._vdom.newInstance(self);
		}

		if (!self.isMounted) {
			(self as any).isMounted = true;
			self.triggerMounted();
		}
		if (update) {
			self.triggerUpdate(vdomOld!, self._vdom!);
		}
		if (self._rerenderCbs) {
			let cbs = self._rerenderCbs;
			self._rerenderCbs = undefined;
			for (let cb of cbs)
				cb();
		}
	}

	constructor(window: Window, {props,children,owner}: Args<P>) {
		this.window = window;
		this.props = props;
		this.children = children;
		this.owner = owner;
	}

	setState<K extends keyof S>(newState: Pick<S, K>, cb?: ()=>void) {
		let update = false;
		let hashStates = this._hashStates;
		let state = this.state as S;
		for (let key in newState as S) {
			let item = (newState as S)[key];
			let hash = Object.hashCode(item);
			if (hash != hashStates.get(key)) {
				state[key] = item;
				hashStates.set(key, hash);
				update = true;
			}
		}
		if (update) {
			this.update(cb);
		} else if (cb) {
			cb();
		}
	}

	update(cb?: ()=>void) {
		if (cb) {
			if (this._rerenderCbs) {
				this._rerenderCbs.push(cb);
			} else {
				this._rerenderCbs = [cb];
			}
		}
		markRerender(this);
	}

	hashCode() {
		return Function.prototype.hashCode.call(this);
	}

	appendTo(parent: View): View {
		return this.dom.appendTo(parent);
	}

	afterTo(prev: View): View {
		return this.dom.afterTo(prev);
	}

	protected triggerLoad(): any {}
	protected triggerMounted(): any {}
	protected triggerUpdate(vdomOld: VirtualDOM, vdomNew: VirtualDOM): any {}
	protected triggerRemove(): any {}
	protected render(): RenderResult {}

	remove() {
		let vdom = this._vdom;
		if (vdom && !this._removeFlag) {
			this._removeFlag = true;
			this.triggerRemove(); // trigger event
			this._vdom = undefined;
			removedom(vdom, this);
			(this as any).isDestroy = true;
		}
	}

	/**
	 * @method render (obj, [parent])
	 * @param vdom {VirtualDOM}
	 * @param parent Optional {View}
	 * @return {DOM} return dom instance
	 */
	static render<T extends DOM = DOM>(vdom: VirtualDOM, parent: View): T {
		let dom = vdom.newInstance(parent.owner!);
		dom.appendTo(parent);
		return dom as T;
	}

	static hashCode() {
		return Function.prototype.hashCode.call(this);
	}

	static readonly isViewController: boolean = true;
}
Object.assign(ViewController.prototype, {
	_ref: '', _vdom: undefined, _removeFlag: false,
	isLoaded: false, isMounted: false, isDestroy: false,
});

export default ViewController;

const rerender = ViewController.rerender;
exports.__setRef = setRef;

const DOMConstructors: {
	[ key in JSX.IntrinsicElementsName ]: DOMConstructor;
} = {
	view: view.View, box: view.Box,
	flex: view.Flex, flow: view.Flow,
	float: view.Float, image: view.Image,
	transform: view.Transform, text: view.Text,
	button: view.Button, label: view.Label,
	input: view.Input, textarea: view.Textarea, scroll: view.Scroll,
};

// create virtual dom dynamic
function _CVDD(value: any): VirtualDOM | null {
	if (value instanceof VirtualDOM) {
		return value
	} else if (Array.isArray(value)) {
		if (value.length) {
			return value.length === 1 ?
				_CVDD(value[0]): new VirtualDOMCollection(value.map(_CVDD));
		}
		return null;
	}
	return value ? VirtualDOMText.fromString(value): null;
}

// create virtual dom, jsx element
export function createElement(
	Type: DOMConstructor | JSX.IntrinsicElementsName,
	props: Dict | null, ...children: any[]): VirtualDOM
{
	if (typeof Type == 'string') {
		Type = DOMConstructors[Type];
	}
	return new VirtualDOM(Type, props, children.map(_CVDD));
}

declare global {
	namespace JSX {
		type Element = VirtualDOM;
	}
}

export const _CVD = createElement;
export type RenderNode = VirtualDOM | string | null | undefined | void;
export type RenderResult = RenderNode[] | RenderNode;