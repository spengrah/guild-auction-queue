import { log, dataSource, BigInt } from "@graphprotocol/graph-ts"
import {
  NewQueue
} from "../../generated/GuildAuctionQueueFactoryVersion00/GuildAuctionQueueFactory"
import { Queue } from "../../generated/schema"
import { GuildAuctionQueue } from "../../generated/templates"

export function handleNewQueue(event: NewQueue): void {
  // log.debug('handling NewQueue', [event.params.queueAddress.toHexString()])

  let queue = new Queue(event.params.queueAddress.toHexString())

  // log.debug('instantiating queue', [event.params.queueAddress.toHexString()])

  queue.token = event.params.token
  queue.owner = event.params.owner
  queue.destination = event.params.destination
  queue.lockupPeriod = event.params.lockupPeriod
  queue.minShares = event.params.minShares
  queue.minBid = event.params.minBid

  queue.accepterType = (queue.minShares > BigInt.fromString("0")) ? "molochMembers" : "owner"

  queue.network = dataSource.network()

  // create new queue entity
  GuildAuctionQueue.create(event.params.queueAddress);

  queue.save()
}