import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts"
import {
  GuildAuctionQueue,
  BidAccepted,
  BidCanceled,
  BidIncreased,
  BidWithdrawn,
  NewBid
} from "../generated/GuildAuctionQueue/GuildAuctionQueue"
import { Bid, Submitter, Accepter, BidIncrease, BidWithdraw, } from "../generated/schema"

export function handleNewBid(event: NewBid): void {
  let bid = new Bid(event.params.id.toHex())

  let submitterId = event.params.submitter.toHexString()
  let submitter = Submitter.load(submitterId)
  if (submitter == null) {
    submitter = new Submitter(submitterId)
  }

  bid.amount = event.params.amount
  bid.submitter = submitter.id
  bid.status = "queued"
  bid.details = event.params.details
  bid.network = dataSource.network()
  bid.createdAt = event.block.timestamp
  bid.createTxHash = event.transaction.hash

  bid.save()
  submitter.save()
}

export function handleBidIncreased(event: BidIncreased): void {
  let bid = Bid.load(event.params.id.toHex())
  let increase = new BidIncrease(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())

  increase.amount = event.params.newAmount.minus(bid.amount)
  increase.bid = bid.id
  increase.createdAt = event.block.timestamp
  increase.txHash = event.transaction.hash

  bid.amount = event.params.newAmount

  bid.save()
  increase.save()
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
  let bid = Bid.load(event.params.id.toHex())
  let withdraw = new BidWithdraw(event.transaction.hash.toHexString() + "-" + event.logIndex.toString())

  withdraw.amount = bid.amount.minus(event.params.newAmount)
  withdraw.bid = bid.id
  withdraw.createdAt = event.block.timestamp
  withdraw.txHash = event.transaction.hash

  bid.amount = event.params.newAmount

  bid.save()
  withdraw.save()
}

export function handleBidAccepted(event: BidAccepted): void {
  let bid = Bid.load(event.params.id.toHex())

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
  let bid = Bid.load(event.params.id.toHex())

  bid.status = "canceled"
  bid.canceledAt = event.block.timestamp
  bid.cancelTxHash = event.transaction.hash

  bid.save()
}






