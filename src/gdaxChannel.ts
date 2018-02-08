import * as WebSocket from 'ws'

import { Observable, Subject, Subscription } from '@reactivex/rxjs'
import { fromEvent } from '@reactivex/rxjs/dist/package/observable/fromEvent'
import { merge } from '@reactivex/rxjs/dist/package/observable/merge'
import { map, switchMap } from '@reactivex/rxjs/dist/package/operators'
import { combineLatest } from '@reactivex/rxjs/dist/package/observable/combineLatest'

export default function gdaxChannel({ url = 'wss://ws-feed.gdax.com' } = {}) {
  let socket
  const message$ = new Subject()
  const subscription$ = new Subject()

  const subscriptions: Subscription[] = []

  const connect = () => {
    if (socket) {
      socket.close()
    }
    subscriptions.forEach(s => s.unsubscribe())
    socket = new WebSocket(url)

    const msg$ = Observable.fromEvent(socket, 'message')
    const open$ = Observable.fromEvent(socket, 'open')
    const close$ = Observable.fromEvent(socket, 'close')
    const err$ = Observable.fromEvent(socket, 'error')

    subscriptions.push(
      merge(
        Observable.fromEvent(socket, 'close'),
        Observable.fromEvent(socket, 'error')
      )
        .switchMap(() => Observable.timer(500, 1000))
        .subscribe(e => {
          console.error(e)
          connect()
        })
    )

    combineLatest(subscription$, open$).subscribe(
      ([subscriptionMsg, openEvent]) => {
        console.log(subscriptionMsg)
        socket.send(JSON.stringify(subscriptionMsg))
      }
    )

    subscriptions.push(
      msg$.subscribe((m: any) => {
        const data = JSON.parse(m.data)
        // console.log('message')
        // console.log(m.data)
        message$.next(data)
      })
    )
  }

  const subscribe = () => {
    // const subscribeMsg = {
    //   type: 'subscribe',
    //   product_ids: ['ETH-USD'],
    //   channels: ['ticker', 'heartbeat'],
    // }
    const subscribeMsg = {
      type: 'subscribe',
      // product_ids: ['ETH-USD'],
      channels: [{ name: 'ticker', product_ids: ['ETH-USD'] }],
    }
    subscription$.next(subscribeMsg)
    // socket.send(JSON.stringify(subscribeMsg))
  }

  // msg$
  // const websocket = new WebsocketClient(
  //   ['ETH-USD'],
  //   'wss://ws-feed.gdax.com',
  //   null,
  //   {
  //     channels: ['ticker'],
  //   }
  // )
  connect()
  return Object.freeze({
    message$,
    connect,
    subscribe,
  })
}
