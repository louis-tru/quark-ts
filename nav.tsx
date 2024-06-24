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

import util from './util';
import { List,ListIterator,ClickType } from './event';
import { KeyboardKeyCode } from './keyboard';
import index, {
	_CVD,link,ViewController,View,Label,Free,Text,
	mainScreenScale,Window,VDom,assertDom,Box,VirtualDOM } from '.';
import * as types from './types';

const px = 1 / mainScreenScale();
const Transition_Time = 400;
const Navigation_Stack: WeakMap<Window, List<Navigation>> = new WeakMap();

export enum NavStatus {
	Init = -1,
	Foreground,
	Background,
}

/**
 * @class NavigationStatus
 */
class NavigationStatus<P={},S={}> extends ViewController<P,S> {
	// 0=init or exit,1=background,2=foreground
	readonly navStatus: NavStatus = NavStatus.Init;
	intoLeave(animate: number) {
		(this as any).navStatus = NavStatus.Init;
	}
	intoBackground(animate: number) {
		(this as any).navStatus = NavStatus.Background;
	}
	intoForeground(animate: number) {
		(this as any).navStatus = NavStatus.Foreground;
	}
}

/**
 * @class Navigation
 */
export class Navigation<P={},S={}> extends NavigationStatus<{
	onBackground?:()=>void,
	onForeground?:()=>void,
}&P,S> {
	private _iterator: ListIterator<Navigation> | null = null;
	private _focusResume: View | null = null;

	protected navStack = (function(window: Window) {
		let stack = Navigation_Stack.get(window);
		if (stack)
			return stack;

		// Init global navigation stack
		stack = new List<Navigation>;
		Navigation_Stack.set(window, stack);

		const root = window.root;

		window.onClose.on(function() {
			Navigation_Stack.delete(window);
		});

		root.onBack.on(function(e) {
			let last = stack.end.prev;
			while (last.value) {
				if ( last.value.navigationBack() ) {
					e.cancelDefault(); // Cancel default action
					break;
				}
				last = last.prev;
			}
		});

		root.onClick.on(function(e) {
			if ( e.type == ClickType.Keyboard ) { // Keyboard triggered events
				let back = stack.back;
				if ( back ) {
					back.navigationEnter(e.sender);
				}
			}
		});

		root.onKeyDown.on(function(e) {
			let nav = stack.back;
			if ( nav ) {
				let nextFocus = e.nextFocus;
	
				switch(e.keycode) {
					case KeyboardKeyCode.LEFT: // left
						nextFocus = nav.navigationLeft(nextFocus); break;
					case KeyboardKeyCode.UP: // up
						nextFocus = nav.navigationTop(nextFocus); break;
					case KeyboardKeyCode.RIGHT: // right
						nextFocus = nav.navigationRight(nextFocus); break;
					case KeyboardKeyCode.DOWN: // down
						nextFocus = nav.navigationDown(nextFocus); break;
					case KeyboardKeyCode.MENU: // menu
						nav.navigationMenu();
					default: return;
				}
				e.nextFocus = nextFocus;
			}
		});

		return stack;
	})(this.window);

	/**
	 * When initializing navigation, return a focus view
	 * @method initFocus()
	 */
	initFocus(): View | null {
		return null;
	}

	intoBackground(animate: number) {
		super.intoBackground(animate);
		this.triggerBackground();
	}

	intoForeground(animate: number) {
		super.intoForeground(animate);
		this.triggerForeground();
	}

	protected triggerBackground() {
		this.props.onBackground?.call(null);
	}

	protected triggerForeground() {
		this.props.onForeground?.call(null);
	}

	protected triggerDestroy() {
		if ( this._iterator ) { // force delete global nav stack
			this.navStack.remove(this._iterator);
			this._iterator = null;
		}
	}

	/**
	 * @method registerNavigation()
	 */
	registerNavigation(animate: number = 0) {
		if ( !this._iterator ) { // No need to repeat it
			this._iterator = this.navStack.pushBack(this);
			let prev = this._iterator.prev;
			if ( prev !== this.navStack.end ) {
				let focus = this.window.focusView;
				prev.value._focusResume =
					focus && prev.value.metaView.isSelfChild(focus) ? focus : null;
				prev.value.intoBackground(animate);
			}
			let view = this.initFocus();
			if ( view ) {
				view.focus();
			}
			this.intoForeground(animate);
		}
	}

	/**
	 * @method unregisterNavigation(time)
	 */
	unregisterNavigation(animate: number = 0) {
		if ( this._iterator ) {
			let last = this.navStack.back;
			this.navStack.remove(this._iterator);
			this._iterator = null;
			if (!last || last !== this)
				return;

			this.intoLeave(animate);
			last = this.navStack.back;
			if ( last ) {
				if (last._focusResume) {
					last._focusResume.focus();
				}
				last.intoForeground(animate);
			}
		}
	}

	/**
	 When a navigation event occurs, the system will first send the event to the focus view,
	If the event can be successfully transmitted to root,
	The event will ultimately be sent to the top of the current navigation list stack
	*/
	navigationBack() {
		/*
		If false is returned here,
		it will continue to pass to the bottom of the navigation list stack,
		Until it returns true or reaches the bottom of the stack to exit the application
		*/
		return true;
	}

	navigationEnter(focus: View) {
		// Rewrite this function to implement your logic
	}

	/**
	 * When returning null, the focus will not change in any way
	 */
	navigationTop(focus: View | null): View | null {
		return focus;
	}

	navigationDown(focus: View | null): View | null {
		return focus;
	}

	navigationLeft(focus: View | null): View | null {
		return focus;
	}

	navigationRight(focus: View | null): View | null {
		return focus;
	}

	/* When pressing the menu button, it will be called up */
	navigationMenu() {
		// Rewrite this function to implement your logic
	}
}

/**
 * @class NavPageCollection
 */
export class NavPageCollection<P={},S={}> extends Navigation<{
	enableAnimate?: boolean,
	padding?: number;
	navbarHeight?: number;
	navbarHidden?: boolean;
	clip?: boolean; // clip box render
	onPush?: (page: NavPage)=>void,
	onPop?: (page: NavPage)=>void,
}&P,S> {
	private _substack = new List<NavPage>();
	private _busy = false;

	/**
	 * @prop enableAnimate
	 */
	@link     enableAnimate: boolean = true;
	@link.acc padding = index.app.screen.statusBarHeight; // ios/android, 20;
	@link.acc navbarHeight = 44;
	@link.acc navbarHidden = false;

	get length() { return this._substack.length }
	get pages() { return this._substack.toArray() }
	get current() {
		util.assert(this.length, 'Empty NavPageCollection');
		return this._substack.back!;
	}

	/**
	 * @method isCurrent
	*/
	isCurrent(page: NavPage) {
		return this._substack.back === page;
	}

	protected triggerPush(page: NavPage) {
		this.props.onPush?.call(null, page);
	}

	protected triggerPop(page: NavPage) {
		this.props.onPop?.call(null, page);
	}

	protected render() {
		return (
			<free width="100%" height="100%" clip={!!this.props.clip}>
				<free ref="page" width="100%" height="100%" />
				<free
					ref="navbar"
					width="100%"
					height={this.navbarHeight}
					paddingTop={Math.max(this.padding, 0)}
					visible={!this.navbarHidden}
					receive={false} // no receive event
				/>
			</free>
		);
	}

	protected triggerMounted() {
		let page = this.children[0];
		if (page) {
			this.push(page as VirtualDOM<NavPage>);
		}
		util.nextTick(()=>
			this.registerNavigation(0)
		);
		return super.triggerMounted();
	}

	protected triggerDestroy() {
		for (let e of this.pages)
			e.destroy();
		return super.triggerDestroy();
	}

	push(arg: VDom<NavPage>, animate?: boolean) {
		if ( this._busy )
			return;
		assertDom(arg, NavPage, 'The argument navpage is not of the correct type, only for NavPage type');

		let time = this.enableAnimate && animate && this.length ? Transition_Time : 0;
		let prev = this._substack.back;
		let page = arg.newDom(this);

		page.appendTo(this.refs.page as View);

		// set page
		(page as any).navStack = this._substack; // private props visit
		(page as any)._prevPage = prev; // private props visit

		if (prev) { // set next page
			(prev as {nextPage:NavPage}).nextPage = page; // private props visit
		}

		this._busy = time ? true: false;
		if ( time ) {
			setTimeout(()=>{ this._busy = false }, time);
		}
		getNavbarDom(page).setBackText(prev ? prev.title : '');

		page.registerNavigation(time);

		// switch and animate
		this.triggerPush(page);
	}

	pop(animate: boolean = false, count = 1) {
		if ( this._busy )
			return;
		count = Number(count) || 0;
		count = Math.min(this.length - 1, count);

		if ( count < 1 ) {
			return;
		}
		let time = this.enableAnimate && animate ? Transition_Time : 0;
		let arr  = this.pages.splice(this.length - count);
		let next = arr.pop();
		if (!next) return;

		arr.forEach(page=>page.intoLeave(0)); // private props visit

		this._busy = time ? true: false;
		if ( time ) {
			setTimeout(()=>{ this._busy = false }, time);
		}

		next.unregisterNavigation(time);

		// switch and animate
		this.triggerPop(next);
	}

	// @overwrite
	navigationBack(): boolean {
		if (this._substack.length)
			return this._substack.back!.navigationBack();
		return false;
	}
	// @overwrite
	navigationEnter(focus: View) {
		if (this._substack.length)
			this._substack.back!.navigationEnter(focus);
	}
	// @overwrite
	navigationTop(focus: View | null) {
		if (this._substack.length)
			return this._substack.back!.navigationTop(focus);
		return focus;
	}
	// @overwrite
	navigationDown(focus: View | null) {
		if (this._substack.length)
			return this._substack.back!.navigationDown(focus);
		return focus;
	}
	// @overwrite
	navigationLeft(focus: View | null) {
		if (this._substack.length)
			return this._substack.back!.navigationLeft(focus);
		return focus;
	}
	// @overwrite
	navigationRight(focus: View | null) {
		if (this._substack.length)
			return this._substack.back!.navigationRight(focus);
		return focus;
	}
	// @overwrite
	navigationMenu() {
		if (this._substack.length)
			this._substack.back!.navigationMenu(); // private props visit
	}
}

/**
 * @class Navbar
 */
export class Navbar<P={},S={}> extends NavigationStatus<{
	hidden?: boolean;
	backIconVisible?: boolean;
	backTextVisible?: boolean;
	backTextColor?: types.ColorStrIn;
	titleTextColor?: types.ColorStrIn;
}&P,S> {
	private _backText: string = '';
	private _titleText: string = '';

	@link hidden = false;
	@link backIconVisible = true;
	@link backTextVisible = false;
	@link backTextColor: types.ColorStrIn = '#fff';
	@link titleTextColor: types.ColorStrIn = '#147EFF';

	get page() { return this.owner as NavPage }

	/**
	 * @method setBackText() set navbar back text
	 */
	setBackText(value: string) {
		if (!this.hidden)
			this.refAs<Label>('back_text').value = value;
		this._backText = value;
	}

	/**
	 * @method setTitleText() set navbar title text
	 */
	setTitleText(value: string) {
		if (!this.hidden)
			this.refAs<Text>('title').value = value;
		this._titleText = value;
	}

	private _handleBack = ()=>{
		this.page.collection.pop(true);
	}

	protected render() {
		return (
			this.hidden ? null:
			<free width="100%" height="100%" align="centerBottom" visible={false}>
				<flex width="100%" height="100%">
					<button
						minWidth="10%"
						maxWidth="40%"
						height="100%"
						paddingLeft={5}
						textColor={this.backTextColor}
						textLineHeight={1} // 100%
						textSize={16}
						onClick={this._handleBack}
					>
						<text
							align="middle" textColor={this.backTextColor}
							textFamily="icon" textSize={20} value="\uedc5" visible={this.backIconVisible}
						/>
						<label ref="back_text" textOverflow="ellipsis" visible={this.backTextVisible} value={this._backText} />
					</button>
					<matrix ref="title_mat" weight={1} height="100%" marginLeft={5}>
						<text
							ref="title"
							width="100%"
							height="100%"
							textColor={this.titleTextColor}
							textLineHeight={1}
							textSize={16}
							textWhiteSpace="noWrap"
							textWeight="bold"
							textOverflow="ellipsisCenter"
							textAlign="center"
							value={this._titleText}
						/>
					</matrix>
					<box
						minWidth="10%"
						maxWidth="40%"
						height="100%"
						marginLeft={5}
					>{this.children}</box>
				</flex>
				{this.renderBody()}
			</free>
		);
	}

	protected renderBody() {}

	intoLeave(time: number) {
		if ( this.navStatus == NavStatus.Foreground && time &&
			!this.hidden &&
			this.domAs().parent!.level
		) {
			this.domAs().transition({ opacity: 0, time }, ()=>this.destroy());
		} else {
			this.destroy();
		}
		super.intoLeave(time);
	}

	intoBackground(time: number) {
		if ( time && !this.hidden && this.domAs().parent!.level ) {
			this.domAs().transition({ opacity: 0, visible: false, time });
		} else {
			this.domAs().opacity = 0;
			this.domAs().visible = false;
		}
		super.intoBackground(time);
	}

	intoForeground(time: number) {
		this.domAs().visible = true;
		if ( time && !this.hidden && this.domAs().parent!.level ) {
			if (this.navStatus == NavStatus.Init) {
				let x = (this.domAs().parent! as Box).clientSize.x;
				this.domAs().transition({ opacity: 1, time }, {opacity:0});
				this.refAs('title_mat').transition({x: 0, time}, {x: x * 0.3 });
			}
			else { // NavStatus.Background
				this.domAs().transition({ opacity: 1, time });
			}
		} else {
			this.domAs().opacity = 1;
		}
		super.intoForeground(time);
	}
}

function getNavbarDom(page: NavPage): Navbar {
	return (page as any)._navbarDom;
}

function backgroundColorReverse(self: NavPage) {
	let color = self.domAs<Box>().backgroundColor.reverse();
	color.a = 255 * 0.6;
	return color;
}

/**
 * @class NavPage
 */
export class NavPage<P={},S={}> extends Navigation<{
	title?: string;
	navbar?: VDom<Navbar>;
	backgroundColor?: types.ColorStrIn;
}&P,{}&S> {
	private _title = '';
	private _navbar: VDom<Navbar> = <Navbar />;
	private _prevPage: NavPage | null = null;
	private _nextPage: NavPage | null = null;
	private _navbarDom: Navbar;

	get prevPage() { return this._prevPage }
	get nextPage() { return this._nextPage }
	get collection() { return this.owner as NavPageCollection }
	get isCurrent() { return this.collection.isCurrent(this) }

	@link backgroundColor: types.ColorStrIn = '#fff';
	@link
	get title() { return this._title }
	set title(value: string) {
		this._title = String(value);
		if (this._navbarDom) {
			this._navbarDom.setTitleText(this._title);
		}
		if (this._nextPage && this._nextPage._navbarDom) {
			this._nextPage._navbarDom.setBackText(value);
		}
	}

	@link
	get navbar() { return this._navbar }
	set navbar(value) {
		assertDom(value, Navbar);
		if (this.isMounted) {
			this.renderNavbar(value);
		}
		this._navbar = value;
	}

	private renderNavbar(navbar: VDom<Navbar>) {
		this._navbarDom = navbar.render(this, {
			parent: this.collection.refs.navbar as View,
			vdom: this._navbar,
			dom: this._navbarDom,
		});
		(this._navbarDom as any)._page = this;
		this._navbarDom.setTitleText(this._title);
		this._navbarDom.setBackText(this.prevPage ? this.prevPage.title : '');
		this.update();
	}

	protected render() {
		let padding = this.collection.navbarHidden || this._navbar.props.hidden ? 0:
			this.collection.padding + this.collection.navbarHeight;
		return (
			<matrix
				width="100%"
				height="match"
				visible={false}
				backgroundColor={this.backgroundColor}
				padding={padding}
			>
				{this.children}
			</matrix>
		);
	}

	protected triggerMounted() {
		this.renderNavbar(this._navbar);
	}

	protected triggerDestroy() {
		this._navbarDom?.destroy();
		return super.triggerDestroy();
	}

	intoLeave(time: number) {
		this._navbarDom.intoLeave(time);
		if ( this.navStatus == NavStatus.Foreground ) {
			if ( time && this.domAs().parent!.level ) {
				let x = (this.domAs().parent! as Box).clientSize.x;
				this.domAs().style = {
					borderColorLeft: backgroundColorReverse(this),
					borderWidthLeft: px,
				};
				this.domAs().transition({ x: x, visible: false, time }, ()=>{
					this.destroy();
				});
				super.intoLeave(time);
				return;
			}
		}
		super.intoLeave(time);
		this.destroy();
	}

	intoBackground(time: number) {
		if ( !this._nextPage )
			return;
		this._navbarDom.intoBackground(time);
		if ( this.navStatus != NavStatus.Background ) {
			let x = (this.domAs().parent as Box).clientSize.x || 100;
			if ( time && this.domAs().parent!.level ) {
				this.domAs().transition({x: x / -3, visible: false, time });
			} else {
				this.domAs().style = { x: x / -3, visible: false };
			}
		}
		super.intoBackground(time);
	}

	intoForeground(time: number) {
		if ( this.navStatus == NavStatus.Foreground )
			return;
		this._navbarDom.intoForeground(time);
		this._nextPage = null;

		if ( this.navStatus == NavStatus.Init ) {
			if ( time && this.domAs().parent!.level ) {
				let x = (this.domAs().parent! as Box).clientSize.x;
				this.domAs().style = {
					visible: true,
					borderColorLeft: backgroundColorReverse(this),
					borderWidthLeft: px,
				};
				this.domAs().transition({ x: 0, time: time }, {x}, ()=>{
					this.domAs<Box>().borderWidthLeft = 0;
				});
			} else {
				this.domAs().style = { x: 0, borderWidthLeft: 0, visible: true };
			}
		}
		else if ( this.navStatus == NavStatus.Background ) {
			if ( time && this.domAs().parent!.level ) {
				this.domAs().visible = true;
				this.domAs().transition({ x: 0, time });
			} else {
				this.domAs().style = { x: 0, visible: true };
			}
		}
		super.intoForeground(time);
	}

	navigationBack() {
		if ( this._prevPage ) {
			this.collection.pop(true);
			return true;
		} else {
			return false;
		}
	}
}