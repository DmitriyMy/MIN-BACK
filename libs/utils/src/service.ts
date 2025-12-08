import { HttpException, HttpStatus } from '@nestjs/common'
import { EmptyResponse, ErrorResponse, Response } from '@app/types/Service'

export const isErrorServiceResponse = <T extends EmptyResponse>(
  response: T | ErrorResponse,
): response is ErrorResponse => {
  return response.status < HttpStatus.OK || response.status >= HttpStatus.AMBIGUOUS
}

export const getResponse = <T>(responseData: T, status: HttpStatus = HttpStatus.OK): Response<T> => {
  return { data: { ...responseData }, status }
}

export const handleExternalServiceError = ({
  errorResponse,
  mappingErrorStatusAndErrorData = {},
}: {
  errorResponse: ErrorResponse
  mappingErrorStatusAndErrorData?: Partial<Record<HttpStatus, { status: HttpStatus; error?: string }>>
}): ErrorResponse => {
  const handledError = mappingErrorStatusAndErrorData[errorResponse.status]

  if (handledError) {
    const { status, error } = handledError
    return { status, error: error ? [error] : errorResponse.error }
  }

  return {
    status: HttpStatus.BAD_GATEWAY,
    error: errorResponse.status === HttpStatus.INTERNAL_SERVER_ERROR ? ['External service error'] : errorResponse.error,
  }
}

export const getData = <T extends EmptyResponse>(response: T | ErrorResponse): T => {
  if (isErrorServiceResponse(response)) {
    const { status, error } = response
    throw new HttpException(error.join(', '), status)
  }
  return response
}
