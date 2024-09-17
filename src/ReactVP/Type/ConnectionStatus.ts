interface IConnectionStatus {
  status: 'accept' | 'replace' | 'reject';
  message: string;
}
export default IConnectionStatus;
