from pydantic import BaseModel


class MessageOut(BaseModel):
    message: str


class RouteStubOut(BaseModel):
    module: str
    status: str
    message: str
