const PRICE_DIFF = 0.1 //10%
const ORDER_ID_SIZE = 6;

const store = new Vuex.Store({
	state: {
		user_balance: {
			"USD": 10000.0,
			"BTC": 1.0,
			"LTC": 2.0,
			"ETH": 10.0,
			"XRP": 20.0
		},
		pairs: {
			"BTCUSD": {
				"fee_buy": 1,
				"fee_sell": 0.001,
				"last_price": 6500.0
			},
			"LTCUSD": {
				"fee_buy": 0.1,
				"fee_sell": 0.01,
				"last_price": 53.0
			},
			"ETHUSD": {
				"fee_buy": 0.1,
				"fee_sell": 0.01,
				"last_price": 197.0
			},
			"XRPUSD": {
				"fee_buy": 0.001,
				"fee_sell": 1,
				"last_price": 0.41
			}
		},
		pair: "BTCUSD",
		orders: {},
		order_id: 0
	},
	actions: {
		sell({commit}, value) {
			commit('SELL', value)
		},
		buy({commit}, value) {
			commit('BUY', value)
		},
		cancelOrder({commit}, value) {
			commit('CANCEL_ORDER', value)
		},
		setPair({commit}, value) {
			commit('SET_PAIR', value)
		}
	},
	mutations: {
		BUY(state, value) {
			var fee = state.pairs[state.pair].fee_buy;
			var timestamp = Date.now ? Date.now().toString() : new Date().getTime().toString();
			var pad = "";
			while(pad.length <= ORDER_ID_SIZE)
				pad += "0";
			pad += state.order_id++;

			state.user_balance[state.pair.substring(3, 6)] -= (value.amount * value.price) + fee;
			state.orders [ timestamp + pad.substr(pad.size-ORDER_ID_SIZE) ] = {
				"action": "bid",
				"pair": state.pair,
				"amount": value.amount,
				"price": value.price,
				"fee": fee
			};
			state.pairs[state.pair].last_price = value.price;
		},
		SELL(state, value) {
			var currency = state.pair.substring(0, 3);
			var fee = state.pairs[state.pair].fee_sell;
			var timestamp = Date.now ? Date.now().toString() : new Date().getTime().toString();
			var pad = "";
			while(pad.length <= ORDER_ID_SIZE)
				pad += "0";
			pad += state.order_id++;

			state.user_balance[currency] -= value.amount + fee;
			state.orders[ timestamp + pad.substr(pad.size-6) ] = {
				"action": "ask",
				"pair": state.pair,
				"amount": value.amount,
				"price": value.price,
				"fee": fee
			};
			state.pairs[state.pair].last_price = value.price;
		},
		CANCEL_ORDER(state, value) {
			if (state.orders[value.id].action == "bid") {
				state.user_balance[state.orders[value.id].pair.substring(3, 6)] += (state.orders[value.id].price * state.orders[value.id].amount) + state.orders[value.id].fee;
			} else if (state.orders[value.id].action == "ask") {
				state.user_balance[state.orders[value.id].pair.substring(0, 3)] += state.orders[value.id].amount + state.orders[value.id].fee;
			}
			delete state.orders[value.id];
		},
		SET_PAIR(state, value) {
			if (value.pair in state.pairs)
				state.pair = value.pair;
		}
	},
	getters: {
		orders(state) {
			return state.orders;
		},
		user_balance(state) {
			return state.user_balance;
		},
		pair(state) {
			return state.pair;
		},
		pairs(state) {
			return state.pairs;
		},
		last_price(state) {
			return state.pairs[state.pair].last_price;
		},
		fee_buy(state) {
			return state.pairs[state.pair].fee_buy;
		},
		fee_sell(state) {
			return state.pairs[state.pair].fee_sell;
		}
	}
});

new Vue({
	el: '#app',
	data: {
		amount_buy: 1.0,
		price_buy: store.getters.last_price,
		total_buy: store.getters.last_price,
		amount_sell: 1.0,
		price_sell: store.getters.last_price,
		total_sell: store.getters.last_price,
		selected_pair: this.pair,
		isErrorBuy: false,
		ErrorBuyText: "",
		isErrorSell: false,
		ErrorSellText: ""
	},
	store,
	computed: {
		orders() {
			return store.getters.orders;
		},
		user_balance() {
			return store.getters.user_balance;
		},
		pair() {
			return store.getters.pair;
		},
		pair_base() {
			return store.getters.pair.substring(0,3);
		},
		pair_quote() {
			return store.getters.pair.substring(3,6);
		},
		pairs() {
			return store.getters.pairs;
		},
		last_price() {
			return store.getters.last_price;
		},
		fee_buy() {
			return store.getters.fee_buy;
		},
		fee_sell() {
			return store.getters.fee_sell;
		}
	},
	methods: {
		setError(action, text) {
			if(action == "buy") {
				this.isErrorBuy = true;
				this.ErrorBuyText = text;
			}
			else if(action == "sell") {
				this.isErrorSell = true;
				this.ErrorSellText = text;
			}
		},
		clearError(action) {
			if(action == "buy") {
				this.isErrorBuy = false;
				this.ErrorBuyText = "";
			}
			else if(action == "sell") {
				this.isErrorSell = false;
				this.ErrorSellText = "";
			}
		},
		buy(amount_buy, price_buy) {
			var currency = this.pair_quote;
			if ((amount_buy * price_buy + this.pairs[this.pair].fee_buy) > this.user_balance[currency]) {
				this.setError("buy", "Not enough " + currency + " to buy");
				this.$forceUpdate();
				return;
			}
			store.dispatch('buy', {
				pair: this.pair,
				amount: Number(amount_buy),
				price: Number(price_buy)
			})
		},
		sell(amount_sell, price_sell) {
			var currency = this.pair_base;
			if ((Number(amount_sell) + this.pairs[this.pair].fee_sell) > this.user_balance[currency]) {
				this.setError("sell", "Not enough " + currency + " to sell");
				this.$forceUpdate();
				return;
			}
			store.dispatch('sell', {
				pair: this.pair,
				amount: Number(amount_sell),
				price: Number(price_sell)
			})
		},
		cancelOrder(key) {
			store.dispatch('cancelOrder', {
				id: key
			})
		},
		setPair(code) {
			store.dispatch('setPair', {
				pair: code
			});
			this.price_buy = this.price_sell = this.total_buy = this.total_sell = store.getters.last_price;
			this.amount_buy = this.amount_sell = 1.0;
			if (this.isErrorBuy) {
				this.clearError("buy");
				this.$forceUpdate();
			}
			else if (this.isErrorSell) {
				this.clearError("sell");
				this.$forceUpdate();				
			}
		},
		handleCost(action, amount, price) {
			if (isNaN(amount) || isNaN(price)) {
				this.setError(action, "Price and Amount should be numbers");
				return;
			}
			if (amount == 0 || price == 0) {
				this.setError(action, "Price and Amount should be greater than 0");
				return;
			}
			if (this.last_price > 0 && Math.abs(price - this.last_price) > this.last_price * PRICE_DIFF) {
				this.setError(action, "Price differs by more than 10% of the last price");
				return;
			}
			if (action == "buy")
				this.total_buy = amount * price;
			else if (action == "sell")
				this.total_sell = amount * price;

			if (this.isErrorBuy || this.isErrorSell) {
				this.clearError(action);
				this.$forceUpdate();
			}
		},
		handleTotalBuy(total) {
			this.amount_buy = total / this.price_buy;
		},
		handleTotalSell(total) {
			this.amount_sell = total / this.price_sell;
		}
	}
})