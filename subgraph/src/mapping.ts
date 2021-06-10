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

  let bidsSubmitted = submitter.bidsSubmitted
  bidsSubmitted.push(bid.id)
  submitter.bidsSubmitted = bidsSubmitted

  bid.save()
  submitter.save()
}

export function handleBidIncreased(event: BidIncreased): void {
  let bid = Bid.load(event.params.id.toHex())
  let increase = new BidIncrease(event.transaction.hash.toHexString())

  increase.amount = event.params.newAmount.minus(bid.amount)
  increase.bid = bid.id
  increase.createdAt = event.block.timestamp
  increase.txHash = event.transaction.hash

  bid.amount = event.params.newAmount

  let increases = bid.increases
  increases.push(increase.id)
  bid.increases = increases

  bid.save()
  increase.save()
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
  let bid = Bid.load(event.params.id.toHex())
  let withdraw = new BidWithdraw(event.transaction.hash.toHexString())

  withdraw.amount = bid.amount.minus(event.params.newAmount)
  withdraw.bid = bid.id
  withdraw.createdAt = event.block.timestamp
  withdraw.txHash = event.transaction.hash

  bid.amount = event.params.newAmount
  
  let withdraws = bid.withdraws
  bid.withdraws.push(withdraw.id)
  bid.withdraws = withdraws

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
  bid.status = "Accepted"
  bid.acceptedAt = event.block.timestamp
  bid.acceptTxHash = event.transaction.hash

  let bidsAccepted = accepter.bidsAccepted
  bidsAccepted.push(bid.id)
  accepter.bidsAccepted = bidsAccepted

  bid.save()
  accepter.save()

}



export function handleBidCanceled(event: BidCanceled): void {
  let bid = Bid.load(event.params.id.toHex())

  bid.status = "Canceled"
  bid.canceledAt = event.block.timestamp
  bid.cancelTxHash = event.transaction.hash

  bid.save()
}






