import { dataSource } from "@graphprotocol/graph-ts"
import {
  NewQueue
} from "../../generated/GuildAuctionQueueFactoryVersion00/GuildAuctionQueueFactory"
import { Queue } from "../../generated/schema"
import { GuildAuctionQueue } from "../../generated/templates"

export function handleNewQueue(event: NewQueue): void {
  let queue = new Queue(event.params.queueAddress.toHexString())

  queue.token = event.params.token
  queue.moloch = event.params.moloch
  queue.destination = event.params.destination
  queue.lockupPeriod = event.params.lockupPeriod
  queue.minShares = event.params.minShares
  queue.network = dataSource.network();

  // create new queue entity
  GuildAuctionQueue.create(event.params.queueAddress);
  
  queue.save()
}