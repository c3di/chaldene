interface ConnectionStatus {
  status: 'accept' | 'replace' | 'reject';
  message: string;
}
export default ConnectionStatus;
