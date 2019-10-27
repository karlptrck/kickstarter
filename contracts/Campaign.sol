pragma solidity ^0.5.8;

contract Campaign {

    address manager;
    uint256 minimumContribution;

    // TODO Optional : remove all public keyword after testing
    uint8 public requestId;
    uint8 public approversCount;

    // key as contributor address
    mapping(address => bool) public approvers;

    // key as [Request.uid]
    mapping(uint8 => Request) public requests;

    // key as [Request.uid] and [contributor address]
    mapping(uint8 => mapping(address => bool)) public approvedBy;

    // key as [Request.uid]
    mapping(uint8 => uint8) public approvedRequestCount;

    // key as [Request.uid]
    mapping(uint8 => bool) public completedRequest;

    struct Request {
        uint uid;
        string description;
        uint256 value;
        address payable recepient;
    }

    modifier onlyManager(){
        require(msg.sender == manager, "Not authorized == Only manager");
        _;
    }

    modifier onlyContributors(){
        require(approvers[msg.sender] == true, "Not authorized == Only contributors");
        _;
    }

    constructor(address _manager, uint256 _minimumContribution) public {
        manager = _manager;
        minimumContribution = _minimumContribution;
    }

    function contribute() external payable {
        require(msg.value >= minimumContribution, "Not enough contribution amount.");

        // stores the address of the contributors
        approvers[msg.sender] = true;

        // increments the number of contributors
        approversCount++;
    }

    function createRequest(string calldata _description, uint256 _value, address payable _recepient) external onlyManager returns(uint8) {
        // checks if the total campaign funds has enough balance to fill the request
        require(address(this).balance >= _value, "Insufficient funds");

        uint8 uid = generateRequestId();
        Request memory request = Request(uid, _description, _value, _recepient);

        // stores the request details
        requests[uid] = request;
        return uid;
    }

    function approveRequest(uint8 _uid) external onlyContributors {
        // checks if the request is valid
        require(requestId >= _uid, "Invalid requestId");

        // checks if the contributor has already approved the request
        require(approvedBy[_uid][msg.sender] == false, "You already approved this request.");

        // set the request as approved by this specific contributor(msg.sender)
        approvedBy[_uid][msg.sender] = true;

        // increment the count of approvals
        approvedRequestCount[_uid]++;
    }

    function finalizeRequest(uint8 _uid) external onlyManager {
        // checks if the request is already completed or invalid
        require(completedRequest[_uid] == false, "Invalid or Request already completed.");

        // checks if the request has enough approvals (more than half of the total contributors)
        require(approvedRequestCount[_uid] > approversCount / 2, "Not engough approvals.");

        Request memory request = requests[_uid];

        // double checks if this contract has enough funds for transfer to vendor
        require(address(this).balance >= request.value, "Insufficient funds");

        // transfer the money to the vendor
        request.recepient.transfer(request.value);

        // marks the request as completed
        completedRequest[_uid] = true;
    }

    function generateRequestId() internal returns(uint8) {
        requestId = requestId + 1;
        return requestId;
    }

}