import {
  BidAccepted,
  BidCanceled,
  BidIncreased,
  BidWithdrawn,
  NewBid,
  MinBidChanged
} from "../../generated/templates/GuildAuctionQueue/GuildAuctionQueue"
import { Queue, Bid, Submitter, Accepter, BidIncrease, BidWithdraw, MinBidChange } from "../../generated/schema"
import { log } from '@graphprotocol/graph-ts';

export function handleNewBid(event: NewBid): void {
  log.info('handleNewBid', [event.address.toHexString() + "-" + event.params.id.toHexString()])

  let bid = new Bid(event.address.toHexString() + "-" + event.params.id.toHexString())

  bid.amount = event.params.amount
  let queue = Queue.load(event.address.toHex())
  bid.queue = queue.id

  let submitterId = event.params.submitter.toHexString()
  let submitter = Submitter.load(submitterId)
  if (submitter == null) {
    submitter = new Submitter(submitterId)
  }
  bid.submitter = submitter.id

  bid.status = "queued"
  bid.details = event.params.details
  bid.createdAt = event.block.timestamp
  bid.createTxHash = event.transaction.hash

  bid.save()
  submitter.save()
}

export function handleBidIncreased(event: BidIncreased): void {
  let bid = Bid.load(event.address.toHexString() + "-" + event.params.id.toHexString())
  let increase = new BidIncrease(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())

  increase.amount = event.params.newAmount.minus(bid.amount)
  increase.bid = bid.id
  increase.increasedAt = event.block.timestamp
  increase.increaseTxHash = event.transaction.hash

  bid.amount = event.params.newAmount

  bid.save()
  increase.save()
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
  let bid = Bid.load(event.address.toHexString() + "-" + event.params.id.toHexString())
  let withdraw = new BidWithdraw(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())

  withdraw.amount = bid.amount.minus(event.params.newAmount)
  withdraw.bid = bid.id
  withdraw.withdrawnAt = event.block.timestamp
  withdraw.withdrawTxHash = event.transaction.hash

  bid.amount = event.params.newAmount

  bid.save()
  withdraw.save()
}

export function handleBidAccepted(event: BidAccepted): void {
  let bid = Bid.load(event.address.toHexString() + "-" + event.params.id.toHexString())

  let accepterId = event.params.acceptedBy.toHexString()
  let accepter = Accepter.load(accepterId)
  if (accepter == null) {
    accepter = new Accepter(accepterId)
  }

  bid.accepter = accepter.id
  bid.status = "accepted"
  bid.acceptedAt = event.block.timestamp
  bid.acceptTxHash = event.transaction.hash

  bid.save()
  accepter.save()

}

export function handleBidCanceled(event: BidCanceled): void {
  let bid = Bid.load(event.address.toHexString() + "-" + event.params.id.toHexString())

  bid.status = "canceled"
  bid.canceledAt = event.block.timestamp
  bid.cancelTxHash = event.transaction.hash

  bid.save()
}

export function handleMinBidChanged(event: MinBidChanged): void {

  let minBidChange = new MinBidChange(event.transaction.hash.toHexString())
  log.debug('minBidChanged event address is {}', [event.address.toHexString()])
  log.debug('minBidChanged tx hash is {}', [event.transaction.hash.toHexString()])

  let queue = Queue.load(event.address.toHexString())
  minBidChange.queue = queue.id

  minBidChange.oldAmount = queue.minBid

  let newMinBid = event.params.newMinBid
  queue.minBid = newMinBid
  minBidChange.newAmount = newMinBid
  minBidChange.changedAt = event.block.timestamp
  minBidChange.changeTxHash = event.transaction.hash

  queue.save()
  minBidChange.save()
}
