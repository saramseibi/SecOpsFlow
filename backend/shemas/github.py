from pydantic import BaseModel


class ConnectIn(BaseModel):
    code: str
    redirect_uri: str


class OrgOut(BaseModel):
    login: str
    avatar_url: str | None = None


class RepoOut(BaseModel):
    db_id: str  
    github_id: int
    name: str
    full_name: str
    owner: str
    private: bool
    default_branch: str


class ScanTriggerIn(BaseModel):
    repository_id: str  
    branch: str | None = None  
    workflow_path: str | None = None  
    workflow_id: int | str | None = None


class RepoWorkflowOut(BaseModel):
    id: int | str | None
    name: str | None
    path: str | None
    state: str | None
