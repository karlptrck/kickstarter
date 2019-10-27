const ethers = require('ethers')
const Campaign = artifacts.require('Campaign')

const MIN_CONTRIBUTIONS = ethers.utils.parseEther('1.0')

let requestId
let currentVendorBalance

contract('Campaign', ([ owner, contributor1, contributor2, contributor3, vendor ]) => {
    before(async () => {
        this.campaign = await Campaign.new(owner, MIN_CONTRIBUTIONS)
        
        await this.campaign.contribute({from : contributor1, value : MIN_CONTRIBUTIONS})
        await this.campaign.contribute({from : contributor2, value : MIN_CONTRIBUTIONS})
        await this.campaign.contribute({from : contributor3, value : MIN_CONTRIBUTIONS})

        currentVendorBalance = await web3.eth.getBalance(vendor)
    })

  
    describe('Features', () => {
        it('should only contribute equal or greater than minimum amount', async () => {
            try{
                await this.campaign.contribute({from : contributor1, value : ethers.utils.parseEther('0.5')})
            }catch(err){
                assert.isTrue(err.message.includes('Not enough contribution amount'))
            }
        })

        it('should be able to create request', async () => {
            await this.campaign.createRequest('test description', ethers.utils.parseEther('2.0'), vendor)
            requestId = await this.campaign.requestId.call()
            assert.equal(requestId, 1)
        })

        it('should not be able to create request amount greater than total funds', async () => {
            try {
                await this.campaign.createRequest('test description', ethers.utils.parseEther('5.0'), vendor)
            }catch(err){
                assert.isTrue(err.message.includes('Insufficient funds'))
            }
        })

        it('should be able to approve request', async () => {
            let beforeApproval = await this.campaign.approvedBy.call(requestId, contributor1)
            assert.isFalse(beforeApproval)

            await this.campaign.approveRequest(requestId, { from : contributor1 })

            let afterApproval = await this.campaign.approvedBy.call(requestId, contributor1)
            assert.isTrue(afterApproval)
        })

        it('should only approve once', async () => {
            try {
                await this.campaign.approveRequest(requestId, { from : contributor1 })
            }catch(err){
                assert.isTrue(err.message.includes('You already approved this request'))
            }
        })

        it('should not be able to finalize without enough approvals', async () => {
            try {
                await this.campaign.finalizeRequest(requestId)
            }catch(err){
                assert.isTrue(err.message.includes('Not engough approvals'))
            }
        })

        it('should be able to finalize request', async () => {
            await this.campaign.approveRequest(requestId, { from : contributor2 })

            let isCompleted = await this.campaign.completedRequest.call(requestId)
            assert.isFalse(isCompleted)
       
            let balanceBeforeFinalize = await web3.eth.getBalance(this.campaign.address)
            let vendorBalanceBefore = await web3.eth.getBalance(vendor)

            console.log(`\n====== BALANCES BEFORE FINALIZING REQUEST ======`)
            console.log(`Campaign Total: ${balanceBeforeFinalize}`)
            console.log(`Vendor: ${vendorBalanceBefore}`)

            assert.equal(balanceBeforeFinalize, ethers.utils.parseEther('3.0'))
        
            await this.campaign.finalizeRequest(requestId)
            
            isCompleted = await this.campaign.completedRequest.call(requestId)
            assert.isTrue(isCompleted)
            
            let balanceAfterFinalize = await web3.eth.getBalance(this.campaign.address)
            let vendorBalanceAfter = await web3.eth.getBalance(vendor)

            console.log(`\n====== BALANCES AFTER FINALIZING REQUEST ======`)
            console.log(`Campaign Total: ${balanceAfterFinalize}`)
            console.log(`Vendor: ${vendorBalanceAfter}\n`)

            assert.equal(balanceAfterFinalize, ethers.utils.parseEther('1.0'))
            assert.isTrue(vendorBalanceAfter > currentVendorBalance)

        })

        it('should not be able to finalize completed request', async () => {
            try {
                await this.campaign.finalizeRequest(requestId)
            }catch(err){
                assert.isTrue(err.message.includes('Invalid or Request already completed.'))
            }
        })
    })

    describe('Authority', () => {
        it('should only createRequest by manager', async () => {
            try {
                await this.campaign.createRequest('test description', ethers.utils.parseEther('2.0'), vendor, { from : contributor1})
            }catch(err){
                assert.isTrue(err.message.includes('Not authorized == Only manager'))
            }
        })

        it('should only approveRequest by contributor', async () => {
            try {
                await this.campaign.approveRequest(requestId, { from : vendor })
            }catch(err){
                assert.isTrue(err.message.includes('Not authorized == Only contributors'))
            }
        })

        it('should only finalizeRequest by manager', async () => {
            try {
                await this.campaign.finalizeRequest(requestId, { from : vendor})
            }catch(err){
                assert.isTrue(err.message.includes('Not authorized == Only manager'))
            }
        })

    })

})