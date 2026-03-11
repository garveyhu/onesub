from backend.complex.response.code import ResultCode


class CustomException(Exception):
    """业务异常：携带 ResultCode 和自定义消息，由全局 exception_handler 捕获"""

    def __init__(self, result_code: ResultCode, message: str = None):
        self.result_code = result_code
        self.message = message if message else result_code.message
        super().__init__(self.message)
