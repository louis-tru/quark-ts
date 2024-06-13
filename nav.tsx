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
	_CVD,link,ViewController,View,Label,Transform,Text,Button,
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

function refresh_bar_style(self: NavPageCollection, time: number) {
	(self as any)._refresh_bar_style(time);
}

/**
 * @class NavPageCollection
 */
export class NavPageCollection<P={},S={}> extends Navigation<{
	onPush?: ()=>void,
	onPop?: ()=>void,
	enableAnimate?: boolean,
	padding?: number;
	navbarHidden?: boolean;
	toolbarHidden?: boolean;
	defaultToolbar?: VDom<Toolbar>;
}&P,S> {
	private _padding = index.app.screen.statusBarHeight; // ios/android, 20
	private _substack = new List<NavPage>();
	private _defaultToolbar?: VDom<Toolbar>;
	private _busy = false;
	private _navbarHidden = false;
	private _toolbarHidden = false;

	get length() { return this._substack.length }
	get pages() { return this._substack.toArray() }
	get current() {
		util.assert(this.length, 'Empty NavPageCollection');
		return this._substack.back!;
	}

	private _refresh_bar_style(time: number) {
		let self: NavPageCollection = this;
		if ( !self.refs.navbar || !self.length )
			return;
		time = self.enableAnimate ? time: 0;
		let navbar =  getNavbarDom(self.current);
		let toolbar = getToolbarDom(self.current) || {
			hidden: true, height: 0, border: 0, backgroundColor: '#0000', borderColor: '#0000'
		};
		let navbarHidden = self._navbarHidden || navbar.hidden; // private props visit
		let toolbarHidden = self._toolbarHidden || toolbar.hidden; // private props visit
		let navbar_height = navbarHidden ? 0 : navbar.height + self._padding + navbar.border; // private props visit
		let toolbar_height = toolbarHidden ? 0 : toolbar.height + toolbar.border;

		if ( time ) {
			if ( !navbarHidden ) (self.refs.navbar as View).visible = true;
			if ( !toolbarHidden ) (self.refs.toolbar as View).visible = true;
			(self.refs.navbar as View).transition({
				height: Math.max(0, navbar_height - navbar.border),
				borderBottom: `${navbar.border} ${navbar.borderColor}`,
				backgroundColor: navbar.backgroundColor,
				time,
			});
			(self.refs.toolbar as View).transition({
				height: Math.max(0, toolbar_height - toolbar.border),
				borderTop: `${toolbar.border} ${toolbar.borderColor}`,
				backgroundColor: toolbar.backgroundColor,
				time,
			});
			(self.refs.page as View).transition({
				height: `${navbar_height + toolbar_height}!`, time
			}, ()=>{
				if ( navbarHidden ) (self.refs.navbar as View).visible = false;
				if ( toolbarHidden ) (self.refs.toolbar as View).visible = false;
			});
		} else {
			(self.refs.navbar as View).style = {
				height: Math.max(0, navbar_height - navbar.border),
				borderBottom: `${navbar.border} ${navbar.borderColor}`,
				backgroundColor: navbar.backgroundColor,
				visible: !navbarHidden,
			};
			(self.refs.toolbar as View).style = {
				height: Math.max(0, toolbar_height - toolbar.border),
				borderTop: `${toolbar.border} ${toolbar.borderColor}`,
				backgroundColor: toolbar.backgroundColor, 
				visible: !toolbarHidden,
			};
			(self.refs.page as View).style = { height: `${navbar_height + toolbar_height}!` };
		}
	}

	/**
	 * @method isCurrent
	*/
	isCurrent(page: NavPage) {
		return this._substack.back === page;
	}

	/**
	 * @field enableAnimate
	 */
	@link enableAnimate: boolean = true;

	/**
	 * @prop defaultToolbar {Toolbar} Set default toolbar
	 */
	@link
	get defaultToolbar() { return this._defaultToolbar }
	set defaultToolbar(value) {
		if (value)
			assertDom(value, Toolbar);
		this._defaultToolbar = value;
	}

	@link
	get padding() { return this._padding }
	set padding(value) {
		util.assert(typeof value == 'number');
		this._padding = Math.max(value, 0);
		this._refresh_bar_style(0);
	}

	@link
	get navbarHidden() { return this._navbarHidden }
	set navbarHidden(value) { this.setNavbarHidden(value, false) }

	@link
	get toolbarHidden() { return this._toolbarHidden }
	set toolbarHidden(value) { this.setToolbarHidden(value, false) }

	/**
	 * @method setNavbarHidden
	 */
	setNavbarHidden(value: boolean, animate?: boolean) {
		this._navbarHidden = !!value;
		this._refresh_bar_style(animate ? Transition_Time : 0);
	}

	/**
	 * @method setToolbarHidden
	 */
	setToolbarHidden(value: boolean, animate?: boolean) {
		this._toolbarHidden = !!value;
		this._refresh_bar_style(animate ? Transition_Time : 0);
	}

	protected triggerPush(page: NavPage) {
		this.props.onPush?.call(null);
	}

	protected triggerPop(page: NavPage) {
		this.props.onPop?.call(null);
	}

	protected render() {
		return (
			<box width="100%" height="100%" clip={true}>
				<free ref="navbar" width="100%" />
				<free ref="page" width="100%" />
				<free ref="toolbar" width="100%" />
			</box>
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

		this._refresh_bar_style(time);

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
		this._refresh_bar_style(time);

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
 * @class Bar
 */
class Bar<P={},S={}> extends NavigationStatus<{
	height?: number
	hidden?: boolean;
	border?: number;
	borderColor?: types.ColorStrIn;
	backgroundColor?: types.ColorStrIn;
}&P,S> {
	protected _height = 44;
	protected _hidden = false;
	protected _border = px;
	protected _borderColor: types.ColorStrIn = '#b3b3b3';
	protected _backgroundColor: types.ColorStrIn = '#f9f9f9';

	get isCurrent() { return this.page.isCurrent }
	get collection() { return this.page.collection }
	get page() { return this.owner as NavPage }

	@link
	get height() { return this._height }
	set height(value) {
		util.assert(typeof value == 'number');
		this._height = value;
		this.refreshStyle(0);
	}

	@link
	get hidden() { return this._hidden }
	set hidden(value) {
		this._hidden = !!value;
		this.refreshStyle(0);
	}

	@link
	get border() { return this._border }
	set border(value: number) {
		util.assert(typeof value == 'number');
		this._border = value;
		this.refreshStyle(0);
	}

	@link
	get borderColor(): types.ColorStrIn { return this._borderColor }
	set borderColor(value) {
		this._borderColor = value;
		this.refreshStyle(0);
	}

	@link
	get backgroundColor(): types.ColorStrIn { return this._backgroundColor }
	set backgroundColor(value) {
		this._backgroundColor = value;
		this.refreshStyle(0);
	}

	get visible() { return this.domAs().visible }
	set visible(value) {
		if ( value ) {
			if (this.isCurrent) {
				this.domAs().visible = true;
			}
		} else {
			if (!this.isCurrent) {
				this.domAs().visible = false;
			}
		}
	}

	setHidden(value: boolean, animate?: boolean) {
		this._hidden = !!value;
		this.refreshStyle(animate ? Transition_Time : 0);
	}

	refreshStyle(time: number) {
		if (this.isCurrent) {
			refresh_bar_style(this.collection, time);
		}
	}
}

/**
 * @class Navbar
 */
export class Navbar<P={},S={}> extends Bar<{
	defaultStyle?: boolean;
	backIconVisible?: boolean;
	titleMenuWidth?: number;
	backTextColor?: types.ColorStrIn;
	titleTextColor?: types.ColorStrIn;
}&P,S> {
	private   _back_panel_width = 0;
	private   _title_panel_width = 0;
	protected _defaultStyle = true;
	protected _backIconVisible = true;
	protected _titleMenuWidth = 40; // display right menu button width
	protected _backgroundColor: types.ColorStrIn = '#2c86e5'; // 3c89fb

	/**
	 * @method _navbar_compute_title_layout
	 */
	private _navbar_compute_title_layout() {
		let self: Navbar = this;
		if ( self._defaultStyle ) {
			let back_text = (self.refs.back_text1 as Label).value;
			let title_text = (self.refs.title_text_panel as Text).value;
			let backIconVisible = self._backIconVisible;

			if ( /*self._page &&*/ self.page.prevPage ) {
				(self.refs.back_text_btn as View).visible = true;
			} else {
				(self.refs.back_text_btn as View).visible = false;
				back_text = '';
				backIconVisible = false;
			}

			let nav_width = self.collection ? self.collection.domAs<Transform>().clientSize.x : 0;
			let back_width = (self.refs.back_text1 as Label).computeLayoutSize(back_text).x + 3; // 3间隔
			let title_width = (self.refs.title_text_panel as Text).computeLayoutSize(title_text).x;
			let marginRight = Math.min(nav_width / 3, Math.max(self._titleMenuWidth, 0));
			let marginLeft = 0;
			let min_back_width = 6;

			if ( backIconVisible ) {
				min_back_width += (self.refs.back_text0 as Label).computeLayoutSize('\uedc5').x;
			}

			(self.refs.title_panel as Box).style = {marginLeft,marginRight,visible:true};
			(self.refs.back_text0 as Label).visible = backIconVisible;

			if ( nav_width ) {
				let title_x = nav_width / 2 - title_width / 2 - marginLeft;
				if ( back_width <= title_x ) {
					back_width = title_x;
				} else { // back 的宽度超过title-x位置
					back_width = Math.min(back_width, (nav_width - marginLeft - marginRight) - title_width);
					back_width = Math.max(min_back_width, back_width);
				}
				title_width = nav_width - back_width -  marginLeft - marginRight;
				self._back_panel_width = back_width;// - min_back_width;
				self._title_panel_width = title_width;
			} else {
				self._back_panel_width = 0;
				self._title_panel_width = 0;
				back_width = 30;
				title_width = 70;
			}

			let back_text_num = back_width / (back_width + title_width);
			let titl_text_num = title_width / (back_width + title_width);

			// 为保证浮点数在转换后之和不超过100,向下保留三位小数
			(self.refs.back_text_panel as Box).width = types.newBoxSize(types.BoxSizeKind.Ratio, back_text_num);
			(self.refs.title_text_panel as Box).width = types.newBoxSize(types.BoxSizeKind.Ratio, titl_text_num);

		} else {
			(self.refs.title_panel as View).visible = false; // hide title text and back text
		}
	}

	@link backTextColor: types.ColorStrIn = '#fff';
	@link titleTextColor: types.ColorStrIn = '#fff';

	@link
	get defaultStyle() { return this._defaultStyle }
	set defaultStyle(value) {
		this._defaultStyle = !!value;
		this._navbar_compute_title_layout();
	}

	@link
	get backIconVisible() { return this._backIconVisible }
	set backIconVisible(value) {
		this._backIconVisible = !!value;
		this._navbar_compute_title_layout();
	}

	@link
	get titleMenuWidth() { return this._titleMenuWidth }
	set titleMenuWidth(value) {
		util.assert(typeof value == 'number');
		this._titleMenuWidth = value;
		this._navbar_compute_title_layout();
	}

	refreshStyle(time: number) {
		if (this.isCurrent) {
			this.domAs<Transform>().align = types.Align.CenterBottom;
			this.domAs<Transform>().height = types.newBoxSize(types.BoxSizeKind.Rem, this.height);
			(this.refs.title_text_panel as Text).style.textLineHeight = this.height;
			(this.refs.back_text_btn as Button).style.textLineHeight = this.height;
			super.refreshStyle(time);
		}
	}

	private _handleBack = ()=>{
		this.collection.pop(true);
	}

	protected render() {
		let height = this.height;
		let textSize = 16;
		return (
			<transform width="100%" height={height} visible={false} align="centerBottom">
				<free width="100%" height="100%">
					{this.children}
					<free ref="title_panel" width="match" height="100%" visible={false}>
						<free ref="back_text_panel" height="100%" maxWidth="100%">
							<button ref="back_text_btn"
								onClick={this._handleBack}
								textColor={this.backTextColor}
								width="match"
								paddingLeft={6}
								textLineHeight={height}
								textSize={textSize}
								textWhiteSpace="noWrap"
								textOverflow="ellipsis"
							>
								<text ref="back_text0"
									textLineHeight={0}
									textSize={20}
									height={26}
									// y={2}
									textColor="inherit"
									textFamily="icon"
									value="\uedc5"
								/>
								<label ref="back_text1" />
							</button>
						</free>
						<text ref="title_text_panel"
							height="100%"
							textColor={this.titleTextColor}
							textLineHeight={height}
							textSize={textSize}
							textWhiteSpace="noWrap"
							textWeight="bold" textOverflow="ellipsis"
						/>
					</free>
				</free>
			</transform>
		);
	}

	/**
	 * @method setBackText # set navbar back text
	 */
	setBackText(value: string) {
		(this.refs.back_text1 as Label).value = value;
		this._navbar_compute_title_layout();
	}
	
	/**
	 * @method $setTitleText # set navbar title text
	 */
	setTitleText(value: string) {
		(this.refs.title_text_panel as Text).value = value;
		this._navbar_compute_title_layout();
	}

	intoLeave(time: number) {
		if ( this.navStatus == NavStatus.Foreground && time ) {
			if ( this._defaultStyle ) {
				let back_icon_width = (this.refs.back_text0 as View).visible ?
					(this.refs.back_text0 as Text).clientSize.x : 0;

				(this.refs.back_text1 as Label).transition({
					x: this._back_panel_width - back_icon_width, time
				});
				(this.refs.title_text_panel as Text).transition({
					x: this._title_panel_width + this._titleMenuWidth, time,
				});
			}
			this.domAs().transition({ opacity: 0, time }, ()=>{
				this.destroy()
			});
		} else {
			this.destroy();
		}
		super.intoLeave(time);
	}

	intoBackground(time: number) {
		// if ( time ) {
			// TODO ...
			// if ( this._defaultStyle ) {
			// 	let back_icon_width = (this.refs.back_text0 as View).visible ? (this.refs.back_text0 as Label).clientWidth : 0;
			// 	(this.refs.back_text1 as View).transition({
			// 		x: -(this.refs.back_text1 as Label).clientWidth, time: time,
			// 	});
			// 	(this.refs.title_text_panel as Text).transition({
			// 		x: -this._back_panel_width + back_icon_width, time: time,
			// 	});
			// }
			// this.domAs().transition({ opacity: 0, time: time }, ()=>{
			// 	this.domAs().visible = false
			// });
		// } else {
			this.domAs().opacity = 0;
			this.domAs().visible = false;
		// }
		super.intoBackground(time);
	}

	intoForeground(time: number) {
		this.domAs().visible = true;
		// if ( time ) {
			// TODO ...
		// 	if ( this._defaultStyle ) {
		// 		let back_icon_width = 0; // this.refs.back_text0.visible ? 20 : 0;
		// 		if ( this.navStatus == -1 ) {
		// 			(this.refs.back_text1 as View).x = this._back_panel_width - back_icon_width;
		// 			(this.refs.title_text_panel as View).x = this._title_panel_width + this._titleMenuWidth;
		// 		}
		// 		(this.refs.back_text1 as View).transition({ x: 0, time });
		// 		(this.refs.title_text_panel as View).transition({ x: 0, time });
		// 	} else {
		// 		(this.refs.back_text1 as View).x = 0;
		// 		(this.refs.title_text_panel as View).x = 0;
		// 	}
		// 	this.domAs().opacity = 0;
		// 	this.domAs().transition({ opacity: 1, time });
		// } else {
			this.domAs().opacity = 1;
			// (this.refs.back_text1 as View).x = 0;
			// (this.refs.title_text_panel as View).x = 0;
		// }
		super.intoForeground(time);
	}
}

/**
 * @class Toolbar
 */
export class Toolbar<P={},S={}> extends Bar<P,S> {
	protected _height = 49;

	protected render() {
		return (
			<free width="match" height="match" visible={false}>{this.children}</free>
		);
	}

	intoLeave(time: number) {
		if ( getToolbarDom(this.collection.current) !== this ) {
			if ( this.navStatus == NavStatus.Foreground && time ) {
				this.domAs().transition({ opacity: 0, time }, ()=>{
					this.destroy();
				});
			} else {
				this.destroy();
			}
		}
		super.intoLeave(time);
	}

	intoBackground(time: number) {
		if ( getToolbarDom(this.collection.current) !== this ) {
			if ( time ) {
				this.domAs().transition({ opacity: 0, time }, ()=>{
					this.domAs().visible = false;
				});
			} else {
				this.domAs().style = {opacity: 0, visible: false };
			}
		}
		super.intoBackground(time);
	}

	intoForeground(time: number) {
		if ( time ) {
			let page = (this.page.nextPage || this.page.prevPage);
			if (!page || getToolbarDom(page) !== this) {
				this.domAs().visible = true;
				this.domAs().opacity = 0;
				this.domAs().transition({ opacity: 1, time });
			}
		} else {
			this.domAs().style = {opacity: 1, visible: true };
		}
		super.intoForeground(time);
	}
}

function getNavbarDom(page: NavPage): Navbar {
	return (page as any)._navbarDom;
}

function getToolbarDom(page: NavPage): Toolbar | undefined {
	return (page as any)._toolbarDom;
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
	toolbar?: VDom<Toolbar>;
	backgroundColor?: types.ColorStrIn;
}&P,{}&S> {
	private _title = '';
	private _navbar: VDom<Navbar> = <Navbar />;
	private _toolbar?: VDom<Toolbar>;
	private _prevPage: NavPage | null = null;
	private _nextPage: NavPage | null = null;
	private _navbarDom: Navbar;
	private _toolbarDom?: Toolbar;

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

	@link
	get toolbar() { return this._toolbar }
	set toolbar(value) {
		if (value)
			assertDom(value, Toolbar);
		value || (this.owner as NavPageCollection).defaultToolbar;
		if (this.isMounted) {
			this.renderToolbar(value);
		}
		this._toolbar = value;
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
		this._navbarDom.refreshStyle(0);
	}

	private renderToolbar(toolbar?: VDom<Toolbar>) {
		if (toolbar) {
			this._toolbarDom = toolbar.render(this, {
				parent: this.collection.refs.navbar as View,
				vdom: this._toolbar,
				dom: this._toolbarDom,
			});
			this._toolbarDom.refreshStyle(0);
		} else {
			if (this._toolbarDom) {
				this._toolbarDom.destroy();
				this._toolbarDom = undefined;
			}
		}
	}

	// @overwrite
	protected render() {
		return (
			<free
				width="100%"
				height="100%"
				visible={false}
				backgroundColor={this.backgroundColor}
			>
				{this.children}
			</free>
		);
	}

	protected triggerMounted() {
		this.renderNavbar(this._navbar);
		this.renderToolbar(this._toolbar);
	}

	// @overwrite
	protected triggerDestroy() {
		if (this._navbarDom) {
			this._navbarDom.destroy();
		}
		if (this._toolbarDom) {
			this._toolbarDom.destroy();
		}
		return super.triggerDestroy();
	}

	// @overwrite
	intoLeave(time: number) {
		this._navbarDom.intoLeave(time);
		this._toolbarDom?.intoLeave(time);
		if ( this.navStatus == NavStatus.Foreground ) {
			if ( time && this.domAs().parent!.level ) {
				this.domAs().style = {
					borderColorLeft: backgroundColorReverse(this),
					borderWidthLeft: px,
				};
				this.domAs().transition({
					x: (this.domAs().parent! as Box).clientSize.x, visible: false, time
				}, ()=>{
					this.destroy();
				});
				super.intoLeave(time);
				return;
			}
		}
		super.intoLeave(time);
		this.destroy();
	}

	// @overwrite
	intoBackground(time: number) {
		if ( !this._nextPage )
			return;
		this._navbarDom.intoBackground(time);
		this._toolbarDom?.intoBackground(time);
		if ( this.navStatus != NavStatus.Background ) {
			if ( time && this.domAs().parent!.level ) {
				this.domAs().transition({x: (this.domAs().parent as Box).clientSize.x / -3, visible: false, time });
			} else {
				this.domAs().style = { x: ((this.domAs().parent as Box).clientSize.x || 100) / -3, visible: false };
			}
		}
		super.intoBackground(time);
	}

	// @overwrite
	intoForeground(time: number) {
		if ( this.navStatus == NavStatus.Foreground )
			return;
		this._navbarDom.intoForeground(time);
		this._toolbarDom?.intoForeground(time);
		this._nextPage = null;
		if ( this.navStatus == NavStatus.Init ) {
			if ( time && this.domAs().parent!.level ) {
				this.domAs().style = {
					borderColorLeft: backgroundColorReverse(this),
					borderWidthLeft: px,
					x: (this.domAs().parent! as Box).clientSize.x,
					visible: true,
				};
				this.domAs().transition({ x: 0, time: time }, ()=>{
					this.domAs<Box>().borderWidthLeft = 0;
				});
			} else {
				this.domAs().style = { x: 0, borderWidthLeft: 0, visible: true };
			}
		}
		else if ( this.navStatus == NavStatus.Background ) {
			if ( time && this.domAs().parent!.level ) {
				this.domAs().visible = true;
				this.domAs().transition({ x: 0, time: time });
			} else {
				this.domAs().style = { x: 0, visible: true };
			}
		}
		super.intoForeground(time);
	}

	// @overwrite
	navigationBack() {
		if ( this._prevPage ) {
			this.collection.pop(true);
			return true;
		} else {
			return false;
		}
	}
}